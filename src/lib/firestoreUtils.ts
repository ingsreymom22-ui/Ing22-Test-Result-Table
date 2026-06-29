import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Level, ClassRecord } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function saveLevel(userId: string, level: Level) {
  const path = `users/${userId}/levels/${level.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'levels', level.id), level);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteLevel(userId: string, levelId: string) {
  const path = `users/${userId}/levels/${levelId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'levels', levelId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveClassRecord(userId: string, classRecord: ClassRecord) {
  const path = `users/${userId}/classes/${classRecord.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'classes', classRecord.id), classRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClassRecordRef(userId: string, classId: string) {
  const path = `users/${userId}/classes/${classId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'classes', classId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToLevels(userId: string, callback: (levels: Level[]) => void) {
  const path = `users/${userId}/levels`;
  const q = query(collection(db, 'users', userId, 'levels'));
  return onSnapshot(q, (snapshot) => {
    const levels = snapshot.docs.map(doc => doc.data() as Level);
    callback(levels);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export function subscribeToClasses(userId: string, callback: (classes: ClassRecord[]) => void) {
  const path = `users/${userId}/classes`;
  const q = query(collection(db, 'users', userId, 'classes'));
  return onSnapshot(q, (snapshot) => {
    const classes = snapshot.docs.map(doc => doc.data() as ClassRecord);
    callback(classes);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}
