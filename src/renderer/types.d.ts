declare module "*.module.css" {
  const styles: { readonly [className: string]: string };
  export default styles;
}

declare module "*.css" {
  const styles: string;
  export default styles;
}
