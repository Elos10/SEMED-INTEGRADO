"""Leitor OMR determinístico para gabaritos de meia folha A4."""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

try:
    import fitz
except ImportError:
    fitz = None

try:
    import zxingcpp
except ImportError:
    zxingcpp = None


CHOICES = "ABCDE"
PX_PER_MM = 10
NORMALIZED_WIDTH = 1485
NORMALIZED_HEIGHT = 2100
EXPECTED_MARKERS = np.float32([[130, 130], [1355, 130], [1355, 1970], [130, 1970]])


@dataclass(frozen=True)
class OmrConfig:
    marker_min_area_ratio: float = float(os.getenv("OMR_MARKER_MIN_AREA_RATIO", "0.00015"))
    marker_max_area_ratio: float = float(os.getenv("OMR_MARKER_MAX_AREA_RATIO", "0.004"))
    marker_min_extent: float = float(os.getenv("OMR_MARKER_MIN_EXTENT", "0.68"))
    marker_aspect_tolerance: float = float(os.getenv("OMR_MARKER_ASPECT_TOLERANCE", "0.30"))
    marker_size_cv_max: float = float(os.getenv("OMR_MARKER_SIZE_CV_MAX", "0.45"))
    sheet_ratio_min: float = float(os.getenv("OMR_SHEET_RATIO_MIN", "0.54"))
    sheet_ratio_max: float = float(os.getenv("OMR_SHEET_RATIO_MAX", "0.80"))
    bubble_inner_radius_ratio: float = float(os.getenv("OMR_BUBBLE_INNER_RADIUS_RATIO", "0.58"))
    debug: bool = os.getenv("OMR_DEBUG", "false").lower() == "true"


class MarkerDetectionError(RuntimeError):
    pass


def processar_arquivo(input_path: Path, config: OmrConfig | None = None) -> dict:
    return processar_lote(input_path, config or OmrConfig())


def carregar_paginas(path: Path) -> list[np.ndarray]:
    if path.suffix.lower() == ".pdf":
        if fitz is None:
            raise RuntimeError("PyMuPDF não instalado")
        document = fitz.open(path)
        try:
            return [cv2.cvtColor(np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n), cv2.COLOR_RGB2BGR)
                    for page in document for pix in [page.get_pixmap(dpi=300, alpha=False)]]
        finally:
            document.close()
    image = cv2.imread(str(path))
    if image is None:
        raise RuntimeError("Imagem ilegível")
    return [image]


def detectar_gabaritos(image: np.ndarray) -> list[np.ndarray]:
    """Gera candidatos para folha inteira e possíveis metades.

    A4 e A5/meia A4 possuem a mesma proporção. Por isso a proporção da
    imagem, sozinha, não permite decidir se o scanner recebeu uma página
    inteira ou uma metade já cortada. O candidato integral precisa sempre
    ser tentado; as divisões funcionam como alternativas para páginas 2-up.
    """
    height, width = image.shape[:2]
    candidates = [image]
    if width / max(height, 1) > 1.15:
        middle = width // 2
        candidates.extend((image[:, :middle], image[:, middle:]))
    elif height / max(width, 1) > 1.15:
        middle = height // 2
        candidates.extend((image[:middle, :], image[middle:, :]))
    return candidates


def detectar_marcadores(image: np.ndarray, config: OmrConfig) -> list[dict]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary = cv2.threshold(cv2.GaussianBlur(gray, (5, 5), 0), 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    contours, _ = cv2.findContours(binary, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    image_area = image.shape[0] * image.shape[1]
    markers = []
    for contour in contours:
        area = cv2.contourArea(contour)
        x, y, width, height = cv2.boundingRect(contour)
        if not config.marker_min_area_ratio * image_area <= area <= config.marker_max_area_ratio * image_area:
            continue
        aspect = width / max(height, 1)
        extent = area / max(width * height, 1)
        if abs(1 - aspect) > config.marker_aspect_tolerance or extent < config.marker_min_extent:
            continue
        markers.append({"point": (x + width / 2, y + height / 2), "area": area, "extent": extent, "aspect": aspect})
    return markers


def ordenar_marcadores(markers: list[dict], shape: tuple[int, ...]) -> np.ndarray:
    height, width = shape[:2]
    quadrants = [
        [m for m in markers if m["point"][0] < width * .40 and m["point"][1] < height * .40],
        [m for m in markers if m["point"][0] > width * .60 and m["point"][1] < height * .40],
        [m for m in markers if m["point"][0] > width * .60 and m["point"][1] > height * .60],
        [m for m in markers if m["point"][0] < width * .40 and m["point"][1] > height * .60],
    ]
    if any(not quadrant for quadrant in quadrants):
        raise MarkerDetectionError("ERRO_PARAMETRIZACAO: quatro marcadores não encontrados")
    expected = [(width * .0875, height * .062), (width * .9125, height * .062), (width * .9125, height * .938), (width * .0875, height * .938)]
    selected = [min(group, key=lambda marker: (marker["point"][0] - target[0]) ** 2 + (marker["point"][1] - target[1]) ** 2) for group, target in zip(quadrants, expected)]
    return np.float32([marker["point"] for marker in selected])


def validar_marcadores(points: np.ndarray, markers: list[dict], shape: tuple[int, ...], config: OmrConfig) -> float:
    height, width = shape[:2]
    selected_areas = []
    for point in points:
        selected_areas.append(min(markers, key=lambda marker: np.linalg.norm(np.array(marker["point"]) - point))["area"])
    coefficient = float(np.std(selected_areas) / max(np.mean(selected_areas), 1))
    top = np.linalg.norm(points[1] - points[0]); bottom = np.linalg.norm(points[2] - points[3])
    right = np.linalg.norm(points[2] - points[1]); left = np.linalg.norm(points[3] - points[0])
    ratio = ((top + bottom) / 2) / max((left + right) / 2, 1)
    polygon = points.reshape((-1, 1, 2)).astype(np.int32)
    if coefficient > config.marker_size_cv_max or not config.sheet_ratio_min <= ratio <= config.sheet_ratio_max or not cv2.isContourConvex(polygon):
        raise MarkerDetectionError("ERRO_PARAMETRIZACAO: geometria dos marcadores incoerente")
    coverage = ((top + bottom) / 2 / width + (left + right) / 2 / height) / 2
    return float(max(0, min(1, coverage * (1 - coefficient))))


def normalizar_gabarito(image: np.ndarray, points: np.ndarray) -> np.ndarray:
    matrix = cv2.getPerspectiveTransform(points, EXPECTED_MARKERS)
    return cv2.warpPerspective(image, matrix, (NORMALIZED_WIDTH, NORMALIZED_HEIGHT))


def interpretar_codigo_barras(value: str) -> dict | None:
    value = value.strip()
    compact = value.startswith("S3") and len(value) == 24
    signed = value.startswith("S2") and "." in value
    if not compact and not signed:
        return None
    encoded = value[2:] if compact else value[2:].split(".", 1)[0]
    signature = None if compact else value.rsplit(".", 1)[1]
    if len(encoded) != 22 or (signed and len(signature or "") != 16):
        return None
    try:
        raw = base64.urlsafe_b64decode(encoded + "==")
    except (ValueError, TypeError):
        return None
    if len(raw) != 16:
        return None
    hex_value = raw.hex()
    sheet_id = f"{hex_value[:8]}-{hex_value[8:12]}-{hex_value[12:16]}-{hex_value[16:20]}-{hex_value[20:]}"
    payload = {"v": 3 if compact else 2, "t": "sheet", "sid": sheet_id}
    if signature:
        payload["sig"] = signature
    return payload


def detectar_codigo_barras(image: np.ndarray) -> dict | None:
    """Lê Code 128 na faixa superior; o QR legado é tentado apenas por compatibilidade."""
    barcode_roi = image[150:400, 150:1335]
    gray = cv2.cvtColor(barcode_roi, cv2.COLOR_BGR2GRAY)
    sharpened = cv2.addWeighted(gray, 2.0, cv2.GaussianBlur(gray, (0, 0), 1.2), -1.0, 0)
    otsu = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    variants = [barcode_roi, gray, sharpened, otsu]
    variants.extend(cv2.resize(item, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST if item is otsu else cv2.INTER_CUBIC) for item in variants[1:])
    if zxingcpp:
        for candidate in variants:
            for result in zxingcpp.read_barcodes(candidate, formats=zxingcpp.BarcodeFormat.Code128, try_rotate=True, try_downscale=True):
                payload = interpretar_codigo_barras(result.text)
                if payload:
                    return payload
    detector_type = getattr(cv2, "barcode_BarcodeDetector", None)
    if detector_type:
        detector = detector_type()
        for candidate in variants:
            try:
                result = detector.detectAndDecodeWithType(candidate)
            except (cv2.error, ValueError):
                continue
            decoded = result[1] if len(result) == 4 and result[0] else ()
            values = decoded if isinstance(decoded, (tuple, list)) else [decoded]
            for value in values:
                payload = interpretar_codigo_barras(str(value))
                if payload:
                    return payload
    return detectar_qrcode_legado(image)


def detectar_qrcode_legado(image: np.ndarray) -> dict | None:
    qr_roi = image[150:480, 150:480]
    gray = cv2.cvtColor(qr_roi, cv2.COLOR_BGR2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    sharpened = cv2.addWeighted(gray, 2.2, cv2.GaussianBlur(gray, (0, 0), 2), -1.2, 0)
    otsu = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    adaptive = cv2.adaptiveThreshold(sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 5)
    variants = [image, qr_roi, gray, sharpened, otsu, adaptive, cv2.bitwise_not(otsu)]
    variants.extend([cv2.resize(candidate, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC if candidate is not otsu else cv2.INTER_NEAREST) for candidate in (gray, sharpened, otsu, adaptive)])
    for epsilon in (.20, .35, .50):
        detector = cv2.QRCodeDetector()
        detector.setEpsX(epsilon); detector.setEpsY(epsilon)
        for candidate in variants:
            bordered = cv2.copyMakeBorder(candidate, 24, 24, 24, 24, cv2.BORDER_CONSTANT, value=255)
            for decoder in (detector.detectAndDecode, detector.detectAndDecodeCurved):
                try:
                    data, _, _ = decoder(bordered)
                except cv2.error:
                    continue
                if not data:
                    continue
                try:
                    payload = json.loads(data)
                    if isinstance(payload, dict):
                        return payload
                except json.JSONDecodeError:
                    continue
    return None


def calcular_preenchimento(binary: np.ndarray, center_x: int, center_y: int, radius: int) -> float:
    roi = binary[center_y - radius:center_y + radius + 1, center_x - radius:center_x + radius + 1]
    if roi.shape != (radius * 2 + 1, radius * 2 + 1):
        return 0.0
    yy, xx = np.ogrid[-radius:radius + 1, -radius:radius + 1]
    mask = (xx * xx + yy * yy) <= radius * radius
    return round(float(np.count_nonzero(roi[mask])) / max(np.count_nonzero(mask), 1), 4)


def ler_respostas(image: np.ndarray, config: OmrConfig, count: int = 20) -> list[dict]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 8)
    radius = round(2.2 * PX_PER_MM * config.bubble_inner_radius_ratio)
    answers = []
    for question in range(count):
        center_y = round((78 + question * 4.6) * PX_PER_MM)
        values = [{"choice": choice, "fill": calcular_preenchimento(binary, round((34 + index * 14) * PX_PER_MM), center_y, radius)} for index, choice in enumerate(CHOICES)]
        answers.append({"question": question + 1, "fills": values})
    return answers


def processar_candidato(image: np.ndarray, page_number: int, candidate_number: int, config: OmrConfig) -> dict:
    markers = detectar_marcadores(image, config)
    points = ordenar_marcadores(markers, image.shape)
    marker_confidence = validar_marcadores(points, markers, image.shape, config)
    normalized = normalizar_gabarito(image, points)
    payload = detectar_codigo_barras(normalized)
    orientation = 0
    if not payload:
        rotated = cv2.rotate(normalized, cv2.ROTATE_180)
        payload = detectar_codigo_barras(rotated)
        if payload:
            normalized = rotated
            orientation = 180
    quality = {"alignment": round(marker_confidence, 4), "markerConfidence": round(marker_confidence, 4), "pageNumber": page_number, "candidateNumber": candidate_number, "orientation": orientation}
    if config.debug:
        quality["markersNorm"] = [[round(float(x / image.shape[1]), 4), round(float(y / image.shape[0]), 4)] for x, y in points]
    return {"pageNumber": page_number, "barcodePayload": payload, "quality": quality, "answers": ler_respostas(normalized, config)}


def processar_lote(input_path: Path, config: OmrConfig) -> dict:
    sheets, errors, seen = [], [], set()
    for page_number, page in enumerate(carregar_paginas(input_path), 1):
        page_results = []
        last_error = "ERRO_PARAMETRIZACAO"
        candidates = detectar_gabaritos(page)
        for candidate_number, candidate in enumerate(candidates, 1):
            orientations = [candidate]
            if candidate.shape[1] / max(candidate.shape[0], 1) > 1.15:
                orientations.extend((cv2.rotate(candidate, cv2.ROTATE_90_CLOCKWISE), cv2.rotate(candidate, cv2.ROTATE_90_COUNTERCLOCKWISE)))
            for orientation_number, oriented in enumerate(orientations):
                try:
                    result = processar_candidato(oriented, page_number, candidate_number * 10 + orientation_number, config)
                    sheet_id = (result.get("barcodePayload") or {}).get("sid")
                    dedupe_key = sheet_id or f"{page_number}:{candidate_number}:{result['quality']['alignment']}"
                    if dedupe_key not in seen:
                        seen.add(dedupe_key); page_results.append(result)
                    break
                except (MarkerDetectionError, RuntimeError) as error:
                    last_error = str(error)
        if not page_results:
            for rotation_number, candidate in enumerate((cv2.rotate(page, cv2.ROTATE_90_CLOCKWISE), cv2.rotate(page, cv2.ROTATE_90_COUNTERCLOCKWISE)), len(candidates) + 1):
                try:
                    result = processar_candidato(candidate, page_number, rotation_number, config)
                    sheet_id = (result.get("barcodePayload") or {}).get("sid")
                    dedupe_key = sheet_id or f"{page_number}:{rotation_number}:{result['quality']['alignment']}"
                    if dedupe_key not in seen:
                        seen.add(dedupe_key); page_results.append(result)
                    break
                except (MarkerDetectionError, RuntimeError) as error:
                    last_error = str(error)
        if page_results:
            sheets.extend(page_results)
        else:
            errors.append({"pageNumber": page_number, "status": "ERRO_PARAMETRIZACAO", "message": last_error[:300]})
    return {"sheets": sheets, "errors": errors, "summary": {"totalDetected": len(sheets) + len(errors), "success": len(sheets), "errors": len(errors)}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--template", required=True)
    args = parser.parse_args()
    print(json.dumps(processar_arquivo(Path(args.input)), ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)
