window.firebaseReady = (async () => {
  const config = window.SEMED_FIREBASE_CONFIG;
  if (!config?.apiKey || !config?.projectId || config.apiKey.startsWith('SUA_')) return null;
  try {
    const version = '12.16.0';
    const [appSdk, authSdk, firestoreSdk, storageSdk, functionsSdk] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-storage.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-functions.js`)
    ]);
    const app = appSdk.initializeApp(config);
    return {
      app,
      auth: authSdk.getAuth(app),
      db: firestoreSdk.getFirestore(app),
      storage: storageSdk.getStorage(app),
      functions: functionsSdk.getFunctions(app, 'southamerica-east1'),
      authSdk, firestoreSdk, storageSdk, functionsSdk
    };
  } catch (error) {
    console.error('Falha ao iniciar Firebase', error);
    return null;
  }
})();
