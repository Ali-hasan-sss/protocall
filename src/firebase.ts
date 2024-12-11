import { ServiceAccount, credential } from "firebase-admin";
import { initializeApp } from "firebase-admin/app";

export function firebaseInit() {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    const adminConfig: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };

    initializeApp({
      credential: credential.cert(adminConfig)
    });

    console.log('****************** FIREBASE INITIALIZED *********************')
  } else {
    console.warn('****************** FIREBASE NOT INITIALIZED *********************')
  }
}
