import type { TimetableElementSelection, TimetablePayload } from "./types";

const DB_NAME = "untiplan-offline-v1";
const KEY_STORE = "encryption-keys";
const CACHE_PREFIX = "untiplan.offline-timetable.v1";

export function offlineTimetablePreferenceKey(filterStorageId:string) {
  return `untiplan.offline-enabled.v1.${filterStorageId}`;
}

export function offlineTimetableCacheKey(filterStorageId:string,week:string,selection:TimetableElementSelection) {
  return `${CACHE_PREFIX}.${filterStorageId}.${week}.${selection.type}-${selection.id}`;
}

export function removeOfflineTimetable(filterStorageId:string,week:string,selection:TimetableElementSelection) {
  localStorage.removeItem(offlineTimetableCacheKey(filterStorageId,week,selection));
}

function database() {
  return new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(KEY_STORE);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

async function encryptionKey(filterStorageId:string) {
  const db=await database();
  try {
    const existing=await new Promise<CryptoKey|undefined>((resolve,reject)=>{const request=db.transaction(KEY_STORE).objectStore(KEY_STORE).get(filterStorageId);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
    if(existing)return existing;
    const key=await crypto.subtle.generateKey({name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
    await new Promise<void>((resolve,reject)=>{const transaction=db.transaction(KEY_STORE,"readwrite");transaction.objectStore(KEY_STORE).put(key,filterStorageId);transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error)});
    return key;
  } finally { db.close(); }
}

function bytesToBase64(bytes:Uint8Array) {
  let binary="";
  for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
  return btoa(binary);
}

function base64ToBytes(value:string) {
  const binary=atob(value);
  return Uint8Array.from(binary,character=>character.charCodeAt(0));
}

export async function saveOfflineTimetable(filterStorageId:string,week:string,selection:TimetableElementSelection,data:TimetablePayload) {
  const key=await encryptionKey(filterStorageId);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify({savedAt:Date.now(),data})));
  localStorage.setItem(offlineTimetableCacheKey(filterStorageId,week,selection),JSON.stringify({iv:bytesToBase64(iv),data:bytesToBase64(new Uint8Array(encrypted))}));
}

export async function readOfflineTimetable(filterStorageId:string,week:string,selection:TimetableElementSelection):Promise<{data:TimetablePayload;savedAt:number}|null> {
  const stored=localStorage.getItem(offlineTimetableCacheKey(filterStorageId,week,selection));
  if(!stored)return null;
  try {
    const value=JSON.parse(stored) as {iv:string;data:string};
    const key=await encryptionKey(filterStorageId);
    const decrypted=await crypto.subtle.decrypt({name:"AES-GCM",iv:base64ToBytes(value.iv)},key,base64ToBytes(value.data));
    const parsed=JSON.parse(new TextDecoder().decode(decrypted)) as {data:TimetablePayload;savedAt:number};
    return Number.isFinite(parsed.savedAt)&&Array.isArray(parsed.data?.lessons)&&Array.isArray(parsed.data?.courses)&&Array.isArray(parsed.data?.holidays)&&Array.isArray(parsed.data?.timeGrid)?parsed:null;
  } catch { return null; }
}

export function clearOfflineTimetables(filterStorageId:string) {
  const prefix=`${CACHE_PREFIX}.${filterStorageId}.`;
  for(let index=localStorage.length-1;index>=0;index-=1){const key=localStorage.key(index);if(key?.startsWith(prefix))localStorage.removeItem(key)}
}
