import { useEffect } from 'react';
import { NavDropdown } from 'react-bootstrap';
import { BsSunFill, BsMoonStarsFill, BsCircleHalf } from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '../store';
import { AppTheme, selectTheme, setTheme, updateTheme } from '../store/local';
import { DropdownCheckItem } from './shared/DropdownCheckItem';

export function ThemeDropdown() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);

  useEffect(() => {
    dispatch(updateTheme());
  }, [dispatch]);

  return (
    <NavDropdown
      title={
        <span className="me-1">
          {!theme && <BsCircleHalf />}
          {theme === 'dark' && <BsMoonStarsFill />}
          {theme === 'light' && <BsSunFill />}
        </span>
      }
      className="d-flex align-items-center"
      align="end"
    >
      <DropdownCheckItem icon={<BsCircleHalf className="me-4" />} checked={!theme} onClick={() => changeTheme(undefined)}>
        Auto
      </DropdownCheckItem>
      <DropdownCheckItem icon={<BsMoonStarsFill className="me-4" />} checked={theme === 'dark'} onClick={() => changeTheme('dark')}>
        Dark
      </DropdownCheckItem>
      <DropdownCheckItem icon={<BsSunFill className="me-4" />} checked={theme === 'light'} onClick={() => changeTheme('light')}>
        Light
      </DropdownCheckItem>
    </NavDropdown>
  );

  function changeTheme(theme: AppTheme) {
    dispatch(setTheme(theme));
    dispatch(updateTheme());
  }
}
