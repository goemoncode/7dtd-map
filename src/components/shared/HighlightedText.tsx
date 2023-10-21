import { RegExpMatch } from '../../worker/lib/filters';

interface Props {
  text: string;
  match?: RegExpMatch | null;
}

export function HighlightedText({ text, match }: Props) {
  if (!match) return <>{text}</>;
  const { index, length } = match;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + length)}</mark>
      {text.slice(index + length)}
    </>
  );
}
