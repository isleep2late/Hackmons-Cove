type VNode = Showdown.Preact.VNode;

export type PreactBattleControlsSpot =
  | 'battle-controls'
  | 'panel'
  | 'battle-options';

export interface PreactBattleControlsOptions {
  ended?: boolean;
  battleHeight?: number;
  timerType?: unknown;
  toggle: VNode | ((spot: PreactBattleControlsSpot, timer: VNode) => VNode);
  renderTimer?: (timer: VNode) => VNode;
  renderContainer: (
    spot: PreactBattleControlsSpot,
    style: Record<string, unknown>,
    children: VNode[],
  ) => VNode;
}

const isVNode = (value: unknown): value is VNode => (
  !!value
    && typeof value === 'object'
    && !Array.isArray(value)
    && !!(value as VNode).props
    && typeof (value as VNode).props === 'object'
);

const isElement = (value: unknown): value is VNode => isVNode(value) && typeof value.type === 'string';

const hasClass = (value: unknown, name: string): boolean => {
  if (!isVNode(value)) {
    return false;
  }

  const { class: className, className: altClassName } = value.props as Record<'class' | 'className', unknown>;
  const classes = typeof className === 'string' ? className : typeof altClassName === 'string' ? altClassName : '';

  return classes.split(/\s+/).includes(name);
};

const numeric = (value: unknown): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const propOf = (node: VNode, name: string): unknown => (node?.props as Record<string, unknown>)?.[name];

const childList = (node: VNode): unknown[] => {
  const children = propOf(node, 'children');

  if (Array.isArray(children)) {
    return children;
  }

  return children === undefined || children === null || typeof children === 'boolean' ? [] : [children];
};

const ownChildList = (node: VNode): unknown[] => {
  if (!Array.isArray(node.props.children)) {
    (node.props as Record<'children', unknown>).children = childList(node);
  }

  return node.props.children as unknown[];
};

export const isNamedPreactComponent = (
  value: unknown,
  name: string,
  type?: unknown,
): value is VNode => (
  isVNode(value)
    && typeof value.type === 'function'
    && (
      (!!type && value.type === type)
        || (value.type as { name?: string; }).name === name
        || (value.type as { displayName?: string; }).displayName === name
    )
);

export const removeNamedPreactChild = (
  parent: VNode,
  name: string,
  depth = 1,
): boolean => {
  if (!isVNode(parent) || depth < 1) {
    return false;
  }

  const children = childList(parent);
  const index = children.findIndex((c) => isNamedPreactComponent(c, name));

  if (index > -1) {
    ownChildList(parent).splice(index, 1);

    return true;
  }

  return depth > 1 && children.some((c) => isVNode(c) && removeNamedPreactChild(c, name, depth - 1));
};

const findBattleControls = (
  parent: VNode,
  depth: number,
  level = 0,
): { node: VNode; level: number; } => {
  const parentIsContainer = level > 0 && hasClass(parent, 'battle-controls-container');

  for (const child of childList(parent)) {
    if (!isElement(child)) {
      continue;
    }

    if (parentIsContainer && hasClass(child, 'battle-controls')) {
      return { node: child, level };
    }

    const found = depth > 1 ? findBattleControls(child, depth - 1, level + 1) : null;

    if (found) {
      return found;
    }
  }

  return null;
};

export const isCompactPreactToggle = (
  spot: PreactBattleControlsSpot,
  timer: VNode,
  longTimer: boolean,
  width: number,
): boolean => spot !== 'battle-options' && !!timer && !!longTimer && numeric(width) !== null && width < 420;

export const injectPreactBattleControls = (
  panel: VNode,
  options: PreactBattleControlsOptions,
): PreactBattleControlsSpot => {
  const {
    ended,
    battleHeight,
    timerType,
    toggle,
    renderTimer,
    renderContainer,
  } = options || {} as PreactBattleControlsOptions;

  if (ended || !isVNode(panel) || typeof renderContainer !== 'function') {
    return null;
  }

  const isTimer = (c: unknown): c is VNode => isNamedPreactComponent(c, 'TimerButton', timerType);
  const renderToggle = (spot: PreactBattleControlsSpot, timer?: VNode) => (
    typeof toggle === 'function' ? toggle(spot, timer || null) : toggle
  );

  const build = (
    spot: PreactBattleControlsSpot,
    style: Record<string, unknown>,
    timer?: VNode,
  ): VNode => renderContainer(spot, style, [
    timer && (typeof renderTimer === 'function' ? renderTimer(timer) : timer),
    renderToggle(spot, timer),
  ].filter(Boolean));

  const battleControls = findBattleControls(panel, 3);

  if (battleControls) {
    const children = ownChildList(battleControls.node);
    const timerIndex = children.findIndex(isTimer);
    const timer = timerIndex > -1 ? children.splice(timerIndex, 1)[0] as VNode : null;

    children.unshift(build('battle-controls', {
      float: 'right',
      position: 'relative',
      marginTop: numeric(propOf(timer, 'top')) ?? (battleControls.level > 1 ? 0 : 2),
      marginRight: 10,
      marginLeft: 6,
    }, timer));

    return 'battle-controls';
  }

  const panelChildren = ownChildList(panel);
  const optionsIndex = panelChildren.findIndex((c) => isElement(c) && propOf(c, 'data-href') === 'battleoptions');

  if (optionsIndex > -1) {
    const optionsButton = panelChildren[optionsIndex] as VNode;
    const optionsStyle = propOf(optionsButton, 'style');

    delete (optionsButton.props as Record<'style', unknown>).style;

    panelChildren[optionsIndex] = renderContainer('battle-options', {
      position: 'absolute',
      top: battleHeight,
      ...(!!optionsStyle && typeof optionsStyle === 'object' ? optionsStyle : null),
      right: 10,
    }, [optionsButton, renderToggle('battle-options')].filter(Boolean));

    return 'battle-options';
  }

  const chatLog = panelChildren.find((c): c is VNode => isNamedPreactComponent(c, 'ChatLog'));
  const panelTop = chatLog
    ? (numeric(propOf(chatLog, 'top')) ?? 0) + 7
    : numeric(battleHeight) !== null
      ? battleHeight + 7
      : null;

  const timerIndex = panelChildren.findIndex(isTimer);

  if (timerIndex > -1) {
    const timer = panelChildren[timerIndex] as VNode;

    panelChildren[timerIndex] = build('panel', {
      position: 'absolute',
      top: numeric(propOf(timer, 'top')) ?? panelTop ?? 0,
      right: 10,
    }, timer);

    return 'panel';
  }

  const containerIndex = panelChildren.findIndex((c) => isElement(c) && hasClass(c, 'battle-controls-container'));

  if (containerIndex < 0 || panelTop === null) {
    return null;
  }

  panelChildren.splice(containerIndex, 0, build('panel', { position: 'absolute', top: panelTop, right: 10 }));

  return 'panel';
};
