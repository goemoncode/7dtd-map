interface Props extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  value: number;
  fractionDigits?: number;
}

export function Distance({ as: Component = 'span', value, fractionDigits = 2, ...props }: Props) {
  return (
    <Component {...props}>
      {value < 1000 ? value : (value / 1000).toFixed(fractionDigits)}
      <small className="ms-1">{value < 1000 ? 'm' : 'km'}</small>
    </Component>
  );
}
