import clsx from 'clsx';

interface Props extends React.HTMLAttributes<HTMLSpanElement> {
  difficulty?: number;
}

export function DifficultyBanner({ difficulty = 0, className, ...props }: Props) {
  return (
    <div className={clsx('text-nowrap', className)} {...props}>
      {!!difficulty && (
        <>
          <span>{new Array(difficulty).fill('💀').join('')}</span>
          <span style={{ opacity: 0.1 }}>{new Array(5 - difficulty).fill('💀').join('')}</span>
        </>
      )}
    </div>
  );
}
