import { useLayoutEffect, useRef } from 'react';
import { Dropdown } from 'react-bootstrap';
import { createPortal } from 'react-dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCallable<T extends (...args: any[]) => any>(maybeFunc: T | unknown): maybeFunc is T {
  return typeof maybeFunc === 'function';
}

export type ContextMenuProps<T extends HTMLElement> = {
  show: boolean;
  top?: number;
  left?: number;
  event?: React.MouseEvent<T>;
  onClose?: () => void;
  children?: React.ReactNode | ((event: React.MouseEvent<T>) => React.ReactNode);
};

export function ContextMenu<T extends HTMLElement>({ show, top, left, event, onClose, children }: ContextMenuProps<T>) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!show) return;
    function onMouseDown(event: MouseEvent) {
      if (event.target instanceof Node && ref.current?.contains(event.target)) {
        return;
      }
      onClose?.();
    }
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [show, onClose]);

  return show
    ? (createPortal(
        <div ref={ref} className="contextmenu position-absolute" style={{ top, left }}>
          <Dropdown show>{event && children ? (isCallable(children) ? children?.(event) : children) : null}</Dropdown>
        </div>,
        document.body
      ) as JSX.Element)
    : null;
}

ContextMenu.Menu = Dropdown.Menu;
ContextMenu.Item = Dropdown.Item;

export default ContextMenu;
