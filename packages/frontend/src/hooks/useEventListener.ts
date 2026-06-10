import { type RefObject, useEffect } from "react";

type ElementEventMap<T> = T extends Document
  ? DocumentEventMap
  : T extends HTMLElement
    ? HTMLElementEventMap
    : T extends SVGElement
      ? SVGElementEventMap
      : T extends MediaQueryList
        ? MediaQueryListEventMap
        : T extends Window
          ? WindowEventMap
          : Record<string, Event>;

export function useEventListener<
  T extends Document | HTMLElement | SVGElement | MediaQueryList | Window,
  K extends keyof ElementEventMap<T>,
>(
  eventName: K,
  handler: (event: ElementEventMap<T>[K]) => void,
  element: RefObject<T | null>,
  options?: boolean | AddEventListenerOptions,
): void;

export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: undefined,
  options?: boolean | AddEventListenerOptions,
): void;

export function useEventListener(
  eventName: string,
  listener: (event: Event) => void,
  element?: RefObject<
    Document | HTMLElement | SVGElement | MediaQueryList | null
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
