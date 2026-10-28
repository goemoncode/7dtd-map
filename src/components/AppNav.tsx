import { Nav } from 'react-bootstrap';
import { BsGithub, BsQuestionCircleFill } from 'react-icons/bs';
import { useAppDispatch } from '../store/index.ts';
import { setHowToUseVisible } from '../store/session.ts';
import { LangDropdown } from './LangDropdown.tsx';
import { ThemeDropdown } from './ThemeDropdown.tsx';
import clsx from 'clsx';

interface Props {
  className?: string;
}

export function AppNav({ className }: Props) {
  const dispatch = useAppDispatch();

  return (
    <>
      <Nav className={clsx('ms-auto', className)}>
        <LangDropdown />
        <ThemeDropdown />
        <Nav.Link title="How to Use" onClick={() => dispatch(setHowToUseVisible(true))}>
          <BsQuestionCircleFill />
        </Nav.Link>
        <Nav.Link href="https://github.com/goemoncode/7dtd-map" target="_blank">
          <BsGithub />
        </Nav.Link>
      </Nav>
    </>
  );
}
