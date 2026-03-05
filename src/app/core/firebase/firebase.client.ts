import { initializeApp, getApp, getApps } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { environment } from '../../../environments/environment';

export const firebaseApp =
  getApps().length ? getApp() : initializeApp(environment.firebase);

export const storage = getStorage(firebaseApp);