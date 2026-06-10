import { type RefObject, useEffect } from "react";

export function useEventListener<K extends keyof DocumentEventMap>(
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  element: RefObject<Document | null>,
  options?: boolean | AddEventListenerOptions,
): void;

export function useEventListener<
  KW extends keyof WindowEventMap,
  KH extends keyof HTMLElementEventMap & keyof SVGElementEventMap,
  KM extends keyof MediaQueryListEventMap,
  T extends HTMLElement | SVGAElement | MediaQueryList = HTMLElement,
>(
  eventName: KW | KH | KM,
  listener: (
    event:
      | WindowEventMap[KW]
      | HTMLElementEventMap[KH]
      | SVGElementEventMap[KH]
      | MediaQueryListEventMap[KM]
      | Event,
  ) => void,
  element?: RefObject<T | null>,
  options?: boolean | AddEventListenerOptions,
): void;

export function useEventListener(
  eventName: string,
  listener: (event: Event) => void,
  element?: RefObject<
    Document | HTMLElement | SVGAElement | MediaQueryList | null
  >,
  options?: boolean | AddEventListenerOptions,
) {
  useEffect(() => {
    const targetElement = element?.current ?? window;
    if (!targetElement?.addEventListener) return;

    targetElement.addEventListener(eventName, listener, options);
    return () => {
      targetElement.removeEventListener(eventName, listener, options);
    };
  }, [element, eventName, listener, options]);
}
