import { describe, expect, it } from 'vitest';
import {
  type PreactBattleControlsOptions,
  type PreactBattleControlsSpot,
  injectPreactBattleControls,
  isCompactPreactToggle,
  isNamedPreactComponent,
  removeNamedPreactChild,
} from './injectPreactBattleControls';

type VNode = Showdown.Preact.VNode;

const h = (
  type: unknown,
  props?: Record<string, unknown>,
  ...children: unknown[]
): VNode => ({
  type,
  props: {
    ...props,
    ...(children.length && { children: children.length > 1 ? children : children[0] }),
  },
}) as VNode;

/* eslint-disable prefer-arrow-callback, func-names */
const PSPanelWrapper = function PSPanelWrapper() { return null as VNode; };
const BattleDiv = function BattleDiv() { return null as VNode; };
const ChatLog = function ChatLog() { return null as VNode; };
const ChatTextEntry = function ChatTextEntry() { return null as VNode; };
const ChatUserList = function ChatUserList() { return null as VNode; };
const TimerButton = function TimerButton() { return null as VNode; };
/* eslint-enable prefer-arrow-callback, func-names */

const room = { id: 'battle-gen9ou-1' };
const controls = () => h('div', { class: 'inline-controls' }, 'controls');

const sideBySide = (timer: boolean, narrow = false) => h(
  PSPanelWrapper,
  { room, focusClick: true, noScroll: 'hidden' },
  null,
  h(
    'div',
    { class: 'scrollable-battle-container', style: 'width:640px' },
    h(BattleDiv, { room }),
    false,
    h(
      'div',
      { class: 'battle-controls-container' },
      h(
        'div',
        { class: `battle-controls${narrow ? '' : ' wide-controls'}`, role: 'complementary', style: 'top:370px;width:640px;' },
        timer && h(TimerButton, { room, top: 0 }),
        controls(),
        null,
      ),
    ),
  ),
  ...(narrow ? [
    h(
      'div',
      { style: 'display:none;' },
      h(ChatLog, { class: 'battle-log hasuserlist', room }),
      h(ChatTextEntry, { room, tinyLayout: true }),
      h(ChatUserList, { room, minimized: true }),
    ),
    h('button', { class: 'battle-chat-toggle button', name: 'showChat' }, 'Chat'),
  ] : [
    h(ChatLog, { class: 'battle-log hasuserlist', room, left: 640 }),
    h(ChatTextEntry, { room, left: 640 }),
    h(ChatUserList, { room, left: 640, minimized: true }),
  ]),
);

const topAndBottom = (timer: boolean) => h(
  PSPanelWrapper,
  { room, focusClick: true, noScroll: 'hidden' },
  null,
  h('div', { style: 'position:relative;height:211px;width:375px;margin:0 auto' }, h(BattleDiv, { room })),
  false,
  h(
    ChatLog,
    { class: 'battle-log hasuserlist', room, top: 211 },
    h('div', { class: 'battle-controls', role: 'complementary' }, controls(), null),
  ),
  h(ChatTextEntry, { room, left: 0, tinyLayout: true }),
  h(ChatUserList, { room, top: 211, minimized: true }),
  timer && h(TimerButton, { room, top: 218 }),
  h('div', { class: 'battle-controls-container' }),
);

const scrolling = (timer: boolean) => h(
  PSPanelWrapper,
  { room, focusClick: true, noScroll: 'hidden' },
  null,
  h(
    ChatLog,
    { class: 'battle-log hasuserlist', room, bottom: 0 },
    h('div', { style: 'height:18px;position:relative' }, h(ChatUserList, { room, top: 0, minimized: true })),
    h(ChatTextEntry, { room, left: 0 }),
    h('div', { style: 'height:360px;width:640px;margin: 0 auto;position:relative' }, h(BattleDiv, { room })),
    false,
    h('div', { class: 'battle-controls inline-battle', role: 'complementary' }, controls(), null),
  ),
  timer && h(TimerButton, { room, top: 7 }),
  h('div', { class: 'battle-controls-container' }),
);

const legacyNarrow = (timer: boolean) => h(
  PSPanelWrapper,
  { room, focusClick: true, noScroll: 'hidden' },
  null,
  h(BattleDiv, { room }),
  h(ChatLog, { class: 'battle-log hasuserlist', room, top: 360 }, h('div', { class: 'battle-controls' }, controls())),
  h(ChatTextEntry, { room, left: 0 }),
  h(ChatUserList, { room, top: 360, minimized: true }),
  h('button', { 'data-href': 'battleoptions', class: 'button', style: { position: 'absolute', right: '10px', top: 362 } }, 'Battle options'),
  timer && h(TimerButton, { room }),
  h('div', { class: 'battle-controls-container' }),
);

const legacyDesktop = (timer: boolean) => h(
  PSPanelWrapper,
  { room, focusClick: true, noScroll: 'hidden' },
  null,
  h(BattleDiv, { room }),
  h(ChatLog, { class: 'battle-log hasuserlist', room, left: 640 }),
  h(ChatTextEntry, { room, left: 640 }),
  h(ChatUserList, { room, left: 640, minimized: true }),
  h('button', { 'data-href': 'battleoptions', class: 'button', style: { position: 'absolute', right: '10px', top: '2px' } }, 'Battle options'),
  h(
    'div',
    { class: 'battle-controls-container' },
    h('div', { class: 'battle-controls', style: 'top: 370px;' }, timer && h(TimerButton, { room }), controls()),
  ),
);

const kids = (node: VNode): unknown[] => {
  const { children } = node.props;

  return Array.isArray(children) ? children : children === undefined || children === null ? [] : [children];
};

const isContainer = (c: unknown): c is VNode => (c as VNode)?.props?.['data-calcdex' as never] === 'overlay-controls';

const findAll = (node: unknown, predicate: (c: VNode) => boolean, out: VNode[] = []): VNode[] => {
  if (!node || typeof node !== 'object') {
    return out;
  }

  const vnode = node as VNode;

  if (predicate(vnode)) {
    out.push(vnode);
  }

  kids(vnode).forEach((c) => void findAll(c, predicate, out));

  return out;
};

const options = (overrides?: Partial<PreactBattleControlsOptions>): PreactBattleControlsOptions => ({
  battleHeight: 211,
  toggle: h('button', { name: 'toggleCalcdexOverlay' }),
  renderTimer: (timer) => h('button', { name: 'restyledTimer', top: (timer.props as Record<'top', unknown>).top }),
  renderContainer: (spot, style, children) => h('div', { 'data-calcdex': 'overlay-controls', 'data-spot': spot, style }, ...children),
  ...overrides,
});

const floated = (marginTop: number) => ({
  float: 'right',
  position: 'relative',
  marginTop,
  marginRight: 10,
  marginLeft: 6,
});

const names = (container: VNode) => kids(container).map((c) => ((c as VNode).props as Record<'name', string>)?.name);

const byClass = (name: string) => (c: VNode) => (c.props as Record<'class', string>)?.class === name;

describe('injectPreactBattleControls()', () => {
  it.each([
    ['wide', false],
    ['narrow (< 500px)', true],
  ])('side-by-side (%s): moves the TimerButton & adds the toggle as a right float leading the .battle-controls', (_, narrow) => {
    const panel = sideBySide(true, narrow);

    expect(injectPreactBattleControls(panel, options())).toBe('battle-controls');

    const [battleControls] = findAll(panel, (c) => /^battle-controls( |$)/.test((c.props as Record<'class', string>)?.class || ''));
    const [first, ...rest] = kids(battleControls) as VNode[];

    expect(isContainer(first)).toBe(true);
    expect((first.props as Record<'style', unknown>).style).toEqual(floated(0));
    expect(names(first)).toEqual(['restyledTimer', 'toggleCalcdexOverlay']);
    expect(rest.findIndex(byClass('inline-controls'))).toBe(0);
    expect(rest.some((c) => c?.type === TimerButton)).toBe(false);
    expect(findAll(panel, isContainer)).toHaveLength(1);
  });

  it('side-by-side without a TimerButton (e.g., spectating): adds only the toggle, in the same spot', () => {
    const panel = sideBySide(false);

    expect(injectPreactBattleControls(panel, options())).toBe('battle-controls');

    const [container] = findAll(panel, isContainer);

    expect(names(container)).toEqual(['toggleCalcdexOverlay']);
    expect((container.props as Record<'style', unknown>).style).toEqual(floated(0));
    expect(kids(findAll(panel, (c) => /^battle-controls( |$)/.test((c.props as Record<'class', string>)?.class || ''))[0])[0]).toBe(container);
    expect(findAll(panel, (c) => c.type === TimerButton)).toHaveLength(0);
  });

  it.each([
    ['top-and-bottom', topAndBottom, 218],
    ['scrolling', scrolling, 7],
  ] as const)('%s: swaps the panel-level TimerButton for the container at its top', (_, layout, top) => {
    const panel = layout(true);
    const timerIndex = kids(panel).findIndex((c) => (c as VNode)?.type === TimerButton);

    expect(injectPreactBattleControls(panel, options())).toBe('panel');

    const container = kids(panel)[timerIndex] as VNode;

    expect(isContainer(container)).toBe(true);
    expect((container.props as Record<'style', unknown>).style).toEqual({ position: 'absolute', top, right: 10 });
    expect(names(container)).toEqual(['restyledTimer', 'toggleCalcdexOverlay']);
    expect(findAll(panel, (c) => c.type === TimerButton)).toHaveLength(0);
  });

  it.each([
    ['top-and-bottom', topAndBottom, 211 + 7],
    ['scrolling', scrolling, 7],
  ] as const)('%s without a TimerButton: puts the toggle where the TimerButton would be', (_, layout, top) => {
    const panel = layout(false);

    expect(injectPreactBattleControls(panel, options({ battleHeight: 999 }))).toBe('panel');

    const children = kids(panel);
    const index = children.findIndex(isContainer);

    expect(index).toBeGreaterThan(-1);
    expect(byClass('battle-controls-container')(children[index + 1] as VNode)).toBe(true);
    expect(((children[index] as VNode).props as Record<'style', unknown>).style).toEqual({ position: 'absolute', top, right: 10 });
    expect(names(children[index] as VNode)).toEqual(['toggleCalcdexOverlay']);
  });

  it('works on the children after CalcdexPreactBattlePanel filters out the falsy ones', () => {
    const panel = topAndBottom(false);

    panel.props.children = kids(panel).filter(Boolean) as VNode[];

    expect(injectPreactBattleControls(panel, options())).toBe('panel');
    expect(kids(panel).findIndex(isContainer)).toBe(kids(panel).length - 2);
  });

  it('legacy desktop: still wraps the TimerButton inside the .battle-controls', () => {
    const panel = legacyDesktop(true);

    expect(injectPreactBattleControls(panel, options())).toBe('battle-controls');

    const [container] = findAll(panel, isContainer);

    expect((container.props as Record<'style', unknown>).style).toEqual(floated(2));
    expect(names(container)).toEqual(['restyledTimer', 'toggleCalcdexOverlay']);
    expect(findAll(panel, (c) => (c.props as Record<'data-href', string>)?.['data-href'] === 'battleoptions')[0].props)
      .toHaveProperty('style');
  });

  it('legacy narrow: still puts the toggle next to the "Battle options" button', () => {
    const panel = legacyNarrow(true);
    const optionsIndex = kids(panel).findIndex((c) => ((c as VNode)?.props as Record<'data-href', string>)?.['data-href'] === 'battleoptions');

    expect(injectPreactBattleControls(panel, options({ battleHeight: 360 }))).toBe('battle-options');

    const container = kids(panel)[optionsIndex] as VNode;

    expect(isContainer(container)).toBe(true);
    expect((container.props as Record<'style', unknown>).style).toEqual({ position: 'absolute', top: 362, right: 10 });

    const [optionsButton, toggle] = kids(container) as VNode[];

    expect((optionsButton.props as Record<'data-href', string>)['data-href']).toBe('battleoptions');
    expect(optionsButton.props).not.toHaveProperty('style');
    expect((toggle.props as Record<'name', string>).name).toBe('toggleCalcdexOverlay');
    expect(findAll(panel, (c) => c.type === TimerButton)).toHaveLength(1);
  });

  it('injects nothing once the battle has ended', () => {
    for (const layout of [sideBySide, topAndBottom, scrolling, legacyNarrow, legacyDesktop]) {
      const panel = layout(false);
      const before = JSON.stringify(panel);

      expect(injectPreactBattleControls(panel, options({ ended: true }))).toBeNull();
      expect(JSON.stringify(panel)).toBe(before);
    }
  });

  it('passes the spot & the host timer (or null) to a toggle renderer', () => {
    const calls: [string, boolean][] = [];
    const toggle = (spot: string, timer: VNode) => {
      calls.push([spot, !!timer]);

      return h('button', { name: 'toggleCalcdexOverlay' });
    };

    injectPreactBattleControls(topAndBottom(true), options({ toggle }));
    injectPreactBattleControls(topAndBottom(false), options({ toggle }));
    injectPreactBattleControls(sideBySide(true), options({ toggle }));

    expect(calls).toEqual([['panel', true], ['panel', false], ['battle-controls', true]]);
  });

  it('matches a renamed TimerButton by identity', () => {
    const Renamed = function a() { return null as VNode; }; // eslint-disable-line prefer-arrow-callback, func-names
    const panel = h(
      PSPanelWrapper,
      null,
      h(ChatLog, { top: 100 }),
      h(Renamed, { room, top: 107 }),
      h('div', { class: 'battle-controls-container' }),
    );

    expect(injectPreactBattleControls(panel, options({ timerType: Renamed }))).toBe('panel');
    expect(names(kids(panel)[1] as VNode)).toEqual(['restyledTimer', 'toggleCalcdexOverlay']);
  });

  it('returns null without throwing on trees it does not recognize', () => {
    expect(injectPreactBattleControls(null, options())).toBeNull();
    expect(injectPreactBattleControls({} as VNode, options())).toBeNull();
    expect(injectPreactBattleControls(h(PSPanelWrapper, null), options())).toBeNull();
    expect(injectPreactBattleControls(h(PSPanelWrapper, null, 'text', h('div', null)), options())).toBeNull();
    expect(injectPreactBattleControls(h(PSPanelWrapper, null, h('div', { class: 'battle-controls-container' })), options({ battleHeight: null })))
      .toBeNull();
    expect(injectPreactBattleControls(topAndBottom(true), null)).toBeNull();
  });
});

describe('isCompactPreactToggle()', () => {
  it.each([
    ['panel', true, true, 375, true],
    ['battle-controls', true, true, 375, true],
    ['battle-controls', true, true, 380, true],
    ['battle-controls', true, true, 419, true],
    ['battle-controls', true, true, 420, false],
    ['battle-controls', true, true, 446, false],
    ['battle-controls', true, true, 640, false],
    ['panel', true, true, 420, false],
    ['battle-options', true, true, 375, false],
    ['panel', false, true, 375, false],
    ['battle-controls', false, true, 375, false],
    ['battle-controls', true, false, 375, false],
    ['panel', true, true, undefined, false],
    ['panel', true, true, null, false],
  ] as const)('%s (timer: %s, long timer: %s, width: %s) -> %s', (spot, hasTimer, longTimer, width, expected) => {
    const timer = hasTimer ? h(TimerButton, { room, top: 0 }) : null;

    expect(isCompactPreactToggle(spot, timer, longTimer, width)).toBe(expected);
  });

  it.each([
    ['side-by-side (< 500px)', 'battle-controls', true, () => sideBySide(true, true)],
    ['top-and-bottom', 'panel', true, () => topAndBottom(true)],
    ['scrolling', 'panel', true, () => scrolling(true)],
    ['legacy narrow', 'battle-options', false, () => legacyNarrow(true)],
  ] as const)('%s at 375px w/ the long timer: toggle in the %s spot, icon-only: %s', (_, spot, compact, layout) => {
    const panel = layout();
    const toggle = (s: PreactBattleControlsSpot, timer: VNode) => h('button', {
      name: 'toggleCalcdexOverlay',
      compact: isCompactPreactToggle(s, timer, true, 375),
    });

    expect(injectPreactBattleControls(panel, options({ toggle }))).toBe(spot);

    const [button] = findAll(panel, (c) => (c.props as Record<'name', string>)?.name === 'toggleCalcdexOverlay');

    expect((button.props as Record<'compact', boolean>).compact).toBe(compact);
  });
});

describe('removeNamedPreactChild()', () => {
  it.each([
    ['side-by-side', () => sideBySide(true), true],
    ['side-by-side (< 500px)', () => sideBySide(true, true), false],
    ['top-and-bottom', () => topAndBottom(true), true],
    ['scrolling', () => scrolling(true), false],
    ['legacy narrow', () => legacyNarrow(true), true],
    ['legacy desktop', () => legacyDesktop(true), true],
  ] as const)('%s: removes the ChatTextEntry', (_, layout, direct) => {
    const isEntry = (c: VNode) => c.type === ChatTextEntry;

    expect(removeNamedPreactChild(layout(), 'ChatTextEntry', 1)).toBe(direct);

    const panel = layout();

    expect(findAll(panel, isEntry)).toHaveLength(1);
    expect(removeNamedPreactChild(panel, 'ChatTextEntry', 2)).toBe(true);
    expect(findAll(panel, isEntry)).toHaveLength(0);
    expect(findAll(panel, (c) => c.type === ChatLog)).toHaveLength(1);
  });

  it('returns false when there is nothing to remove', () => {
    expect(removeNamedPreactChild(h(PSPanelWrapper, null, h(ChatLog, null)), 'ChatTextEntry', 2)).toBe(false);
    expect(removeNamedPreactChild(null, 'ChatTextEntry', 2)).toBe(false);
  });
});

describe('isNamedPreactComponent()', () => {
  it('matches components by name, never host elements', () => {
    expect(isNamedPreactComponent(h(TimerButton, null), 'TimerButton')).toBe(true);
    expect(isNamedPreactComponent(h('TimerButton', null), 'TimerButton')).toBe(false);
    expect(isNamedPreactComponent('TimerButton', 'TimerButton')).toBe(false);
  });
});
