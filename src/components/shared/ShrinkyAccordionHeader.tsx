import { useContext } from 'react';
import { Accordion, AccordionContext, Stack } from 'react-bootstrap';
import clsx from 'clsx';

interface Props {
  icon?: React.ReactNode;
  title?: React.ReactNode;
}

export function ShrinkyAccordionHeader({ icon, title, children }: React.PropsWithChildren<Props>) {
  const { activeEventKey } = useContext(AccordionContext);
  const isShrink = activeEventKey === null;

  return (
    <Accordion.Header className={clsx({ shrinky: isShrink })}>
      <Stack direction="horizontal" gap={3}>
        {icon}
        <div className={clsx({ 'd-md-none': isShrink })}>{title ?? children}</div>
      </Stack>
    </Accordion.Header>
  );
}
