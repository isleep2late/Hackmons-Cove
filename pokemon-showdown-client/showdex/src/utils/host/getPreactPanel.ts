export const getPreactPanel = (
  ps: Partial<Pick<Showdown.PS, 'getPanel' | 'panel'>>,
): Showdown.PSRoom => (
  typeof ps?.getPanel === 'function'
    ? ps.getPanel()
    : ps?.panel
) || null;
