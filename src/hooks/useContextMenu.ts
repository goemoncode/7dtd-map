import { useCallback, useState } from 'react';
import { ContextMenuProps } from '../components/shared/ContextMenu';

export function useContextMenu<T extends HTMLElement>(): [
  props: ContextMenuProps<T>,
  handleContextMenu: (event: React.MouseEvent<T>) => void,
  handleMenuClick: (onClick: () => void) => () => void
] {
  const [props, setProps] = useState<ContextMenuProps<T>>({ show: false });

  const handleContextMenu = useCallback((event: React.MouseEvent<T>) => {
    event.preventDefault();
    setProps({
      show: true,
      left: event.pageX,
      top: event.pageY,
      event,
      onClose() {
        setProps({ show: false });
      },
    });
  }, []);

  const handleMenuClick = useCallback((onMenuClick?: () => void) => {
    return () => {
      onMenuClick?.();
      setProps({ show: false });
    };
  }, []);

  return [props, handleContextMenu, handleMenuClick];
}
