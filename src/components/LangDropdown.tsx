import { NavDropdown } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../store';
import { selectLanguage, setLanguage } from '../store/local';
import { Languages } from '../utils/language';
import { DropdownCheckItem } from './shared/DropdownCheckItem';

export function LangDropdown() {
  const dispatch = useAppDispatch();
  const language = useAppSelector(selectLanguage);

  return (
    <NavDropdown title={<span className="text-capitalize me-1">{language}</span>} className="d-flex align-items-center" align="end">
      {Languages.map((value) => (
        <DropdownCheckItem key={value} checked={value === language} onClick={() => dispatch(setLanguage(value))}>
          <span className="text-capitalize">{value}</span>
        </DropdownCheckItem>
      ))}
    </NavDropdown>
  );
}
