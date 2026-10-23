type MastheadProps = { title: string; motto: string };

export function Masthead({ title, motto }: MastheadProps) {
  return <header><p aria-label="Marka monogramı">MKA</p><div><h1>{title}</h1><p>{motto}</p></div></header>;
}
