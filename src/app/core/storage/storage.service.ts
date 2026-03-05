import { Injectable } from '@angular/core';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/firebase.client';

@Injectable({ providedIn: 'root' })
export class StorageService {
  async uploadProductImage(file: File, concesionId: string) {
    const safeName = file.name.replace(/\s+/g, '_');
    const path = `concesiones/${concesionId}/productos/${Date.now()}_${safeName}`;

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file, { contentType: file.type });

    return await getDownloadURL(storageRef);
  }
}