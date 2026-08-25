"use client";
import { useEffect, useRef } from "react";

export function useModalFocus(close:()=>void) {
  const ref=useRef<HTMLElement>(null);
  const closeRef=useRef(close);
  useEffect(()=>{closeRef.current=close},[close]);
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const root=ref.current;
    if(!root)return;
    const focusable=()=>[...root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')];
    focusable()[0]?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();closeRef.current();return}
      if(event.key!=="Tab")return;
      const items=focusable();if(!items.length)return;
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    root.addEventListener("keydown",keydown);
    return()=>{root.removeEventListener("keydown",keydown);previous?.focus()};
  },[]);
  return ref;
}
