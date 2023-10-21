import { useCallback, useState } from 'react';

export interface UseModalProps {
  show?: boolean;
  onHide?: () => void;
}

export function useModal<P extends UseModalProps>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _: React.ComponentType<P>,
  initialProps: P
): [modalProps: P, showModal: (props: P) => void, updateModal: (props: Partial<P>) => void] {
  const [modalProps, setModalProps] = useState<P>({ show: false, ...initialProps });
  const showModal = useCallback((props: P) => {
    setModalProps({
      ...props,
      show: true,
      onHide() {
        props.onHide?.();
        setModalProps((p) => ({ ...p, show: false }));
      },
    });
  }, []);
  const updateModal = useCallback((props: Partial<P>) => {
    setModalProps((p) => ({ ...p, ...props }));
  }, []);
  return [modalProps, showModal, updateModal];
}
