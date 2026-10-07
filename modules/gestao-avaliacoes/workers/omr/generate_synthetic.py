from pathlib import Path
import cv2,numpy as np
OUT=Path('tests/fixtures/generated');OUT.mkdir(parents=True,exist_ok=True)
def sheet(marks):
    image=np.full((1900,1285,3),255,np.uint8)
    for x,y in [(30,30),(1255,30),(1255,1870),(30,1870)]:cv2.rectangle(image,(x-20,y-20),(x+20,y+20),(0,0,0),-1)
    for q in range(20):
        y=int((78-10+q*4.6)*10)
        for j,ch in enumerate('ABCDE'):
            x=int((34-10+j*14)*10);cv2.circle(image,(x,y),22,(0,0,0),2)
            if ch in marks.get(q+1,[]):cv2.circle(image,(x,y),15,(0,0,0),-1)
    return image
cv2.imwrite(str(OUT/'marked_blank_multiple.png'),sheet({1:['B'],2:[],3:['A','D'],4:['E']}))
base=sheet({q:['ABCDE'[(q-1)%5]] for q in range(1,21)});m=cv2.getRotationMatrix2D((642,950),2.5,1);cv2.imwrite(str(OUT/'rotated_2_5deg.png'),cv2.warpAffine(base,m,(1285,1900),borderValue=(255,255,255)))
src=np.float32([[0,0],[1284,0],[1284,1899],[0,1899]]);dst=np.float32([[35,20],[1240,45],[1270,1870],[10,1890]]);cv2.imwrite(str(OUT/'perspective.png'),cv2.warpPerspective(base,cv2.getPerspectiveTransform(src,dst),(1285,1900),borderValue=(255,255,255)))
print(OUT)
