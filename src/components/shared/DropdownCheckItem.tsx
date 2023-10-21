import { MouseEventHandler, PropsWithChildren } from 'react';
import { Dropdown } from 'react-bootstrap';
import { BsCheck2 } from 'react-icons/bs';
import clsx from 'clsx';

interface Props {
  icon?: React.ReactElement;
  text?: React.ReactElement;
  checked?: boolean;
  onClick?: MouseEventHandler<HTMLElement>;
}

export function DropdownCheckItem({ icon, text, checked, onClick, children }: PropsWithChildren<Props>) {
  return (
    <Dropdown.Item className="d-flex align-items-center px-5" onClick={onClick}>
      {icon}
      {text ?? children}
      <BsCheck2 className={clsx(['ms-auto', { invisible: !checked }])} />
    </Dropdown.Item>
  );
}
