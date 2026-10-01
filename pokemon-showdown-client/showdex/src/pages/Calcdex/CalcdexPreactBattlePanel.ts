/**
 * @file `CalcdexPreactBattlePanel.ts`
 * @author Keith Choison <keith@tize.io>
 * @since 1.3.0
 */

/* eslint-disable max-classes-per-file */

import type * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import cx from 'classnames';
import { calcdexSlice } from '@showdex/redux/store';
import { tRef } from '@showdex/utils/app';
import { nonEmptyObject } from '@showdex/utils/core';
import { logger } from '@showdex/utils/debug';
import {
  detectPreactHost,
  injectPreactBattleControls,
  isCompactPreactToggle,
  removeNamedPreactChild,
} from '@showdex/utils/host';
import { BootdexPreactAdapter as Adapter } from '../Bootdex/BootdexPreactAdapter';
import { preact } from '../Bootdex/BootdexPreactBootstrappable';
import { type CalcdexBootstrappable } from './CalcdexBootstrappable';
import { CalcdexPreactBattle } from './CalcdexPreactBattle';
import { CalcdexPreactBattleTimerButton } from './CalcdexPreactBattleTimerButton';
import styles from './Calcdex.module.scss';

const PSBattleRoom = detectPreactHost(window) ? window.BattleRoom : null;
const PSBattlePanel = detectPreactHost(window) ? window.BattlePanel : null;
const PSTimerButton = detectPreactHost(window) ? window.TimerButton : null;

const l = logger('@showdex/pages/Calcdex/CalcdexPreactBattlePanel');

export class CalcdexPreactBattleRoom extends PSBattleRoom {
  public static readonly scope = l.scope;

  public declare battle: CalcdexPreactBattle;

  /** Populated by the `CalcdexPreactBootstrapper`'s `patchCalcdexIdentifier()` & invoked by the `CalcdexPreactBattlePanel`. */
  public calcdexServerIdPatcher?: CalcdexBootstrappable['patchServerCalcdexIdentifier'] = null;

  public constructor(props: ConstructorParameters<typeof PSBattleRoom>[0]) {
    super(props);

    this.clientCommands = {
      ...this.clientCommands,
      ...this.parseClientCommands({
        calcdex(argv: string) {
          const [target, command] = argv.split('\x20');

          l.debug(
            'RECV', '/calcdex', argv,
            '\n', 'argv', '(target)', target, '(command)', command,
            '\n', 'battle.id', this.battle?.id,
          );

          // i.e., '/calcdex overlay toggle', where argv = 'overlay toggle'.split('\x20') -> ['overlay', 'toggle']
          if (
            !this.battle?.id
              || this.calcdexState?.renderMode !== 'overlay'
              || (target !== 'overlay' && command !== 'toggle')
          ) {
            return;
          }

          Adapter.store.dispatch(calcdexSlice.actions.update({
            scope: `${l.scope}:CalcdexPreactBattleRoom:clientCommands.calcdex()`,
            battleId: this.battle.id,
            overlayVisible: !this.calcdexState?.overlayVisible,
          }));

          this.update(null);
        },
      }),
    };
  }

  public get calcdexState() {
    return Adapter.rootState?.calcdex?.[this.battle?.id];
  }

  public get calcdexSettings() { // eslint-disable-line class-methods-use-this
    return Adapter.rootState?.showdex?.settings?.calcdex;
  }

  // note: actually not reliable when the user leaves the room since it'll be received by PS.receive() instead,
  // while the CalcdexPreactBattleRoom (i.e., this) is already destroy()'d, so this wouldn't fire :o
  // update (2025/08/22): just ended up creating a CalcdexPreactBattleForfeitPanel instead, so this here primarily
  // handles the winning case since the user would typically remain in the room for a bit after
  // (also wow these CalcdexPreactBattle* class names are getting kinda -vvv lol yolo)
  public override receiveLine(args: Showdown.Args): void {
    l.debug(
      'CalcdexPreactBattleRoom:receiveLine()', args,
      '\n', 'battle', this.battle?.id, this.battle,
      '\n', 'room', this.id, this,
    );

    // e.g., '|win|showdex_testee' -> args = ['win', 'showdex_testee']
    if (args[0] === 'win' && typeof this.battle?.calcdexWinHandler === 'function') {
      this.battle.calcdexWinHandler(args[1]);
    }

    // when args[0] is 'win' / 'tie', this will call this.receiveRequest(null),
    // which will nullify this.request & this.choices
    super.receiveLine(args);
  }

  public override destroy(): void {
    if (!detectPreactHost(window)) {
      return void super.destroy();
    }

    l.debug(
      'destroy()', 'called for the CalcdexPreactBattleRoom of', this.battle.id,
      '\n', 'room', this.id, this,
      '\n', 'battle', this.battle,
      '\n', 'state', this.calcdexState,
      '\n', 'settings', this.calcdexSettings,
    );

    if (this.battle.calcdexInit) {
      if (this.calcdexSettings?.closeOn === 'battle-tab' && this.battle.calcdexRoom?.id) {
        window.PS.leave(this.battle.calcdexRoomId); // -> CalcdexPreactRoom:destroy()
      }

      this.battle.destroy(false);
    }

    super.destroy();
  }
}

/** @todo switch to overlay <-> panel buttons or something lol -keith (2025/08/14) */
export class CalcdexPreactBattlePanel extends PSBattlePanel<CalcdexPreactBattleRoom> {
  public static readonly scope = l.scope;
  public static readonly Model = CalcdexPreactBattleRoom;

  // only used for Calcdexes w/ the 'overlay' renderMode
  // (note: ReactDOM.Root is inside the CalcdexPreactBattle)
  // private readonly __calcdexRef = preact?.createRef<HTMLDivElement>(); // moved to CalcdexPreactBattle:calcdexReactRef
  // private __calcdexVNode?: Showdown.Preact.VNode = null;

  protected get battleRoom() {
    return this.props.room;
  }

  protected get battle() {
    return this.battleRoom?.battle;
  }

  protected get battleRequest() {
    return this.battleRoom?.request;
  }

  protected get battleState() {
    return this.battleRoom?.calcdexState;
  }

  public override componentWillUnmount() {
    if (this.battle?.calcdexInit && this.battle.calcdexAsOverlay) {
      this.lockMobileZoom(false);
      this.battle.unmountCalcdexDom();
    }

    super.componentWillUnmount();
  }

  public override receiveRequest(request: Showdown.BattleRequest): void {
    if (!detectPreactHost(window) || !nonEmptyObject(request?.side)) {
      return void super.receiveRequest(request);
    }

    // note: this internally sets battle.myPokemon[] to request.side.pokemon[], but similar to the CalcdexClassicBootstrapper,
    // we'll want the version of myPokemon[] w/ a lil less valhalla (good song & VSTs tho)
    const myPokemon = [...(request.side.pokemon || [])];

    super.receiveRequest(request);

    if (this.battle?.id && myPokemon?.length && !this.battle.myPokemon?.length) {
      this.battle.myPokemon = myPokemon;
    }

    // note: this case is entirely possible in 'panel' renderMode's if the user refreshed the page mid-battle &
    // the CalcdexPreactBattleRoom loads before the CalcdexPanelRoom, typically when the first command received
    // from the server is to '/join' the CalcdexPreactBattleRoom; however, it's also entirely possible Showdex
    // couldn't swap out Showdown's Battle classes in time (e.g., Battle, BattleRequest, Side), so at that point oof
    if (!this.battle?.calcdexInit && typeof this.battle?.runCalcdex === 'function') {
      this.battle.runCalcdex();
    }

    this.battleRoom.calcdexServerIdPatcher?.(myPokemon);

    l.debug(
      'CalcdexPreactBattlePanel:receiveRequest()', 'for room', this.battleRoom?.id,
      '\n', 'myPokemon[]', '(argv:0)', myPokemon,
      '\n', '->', 'battle.myPokemon[]', this.battle?.myPokemon,
      '\n', 'request', '(super)', request,
      '\n', '->', 'room.request', this.battleRequest,
      '\n', 'battle.calcdexInit?', this.battle?.calcdexInit, 'calcdexStateInit?', this.battle?.calcdexStateInit,
      '\n', 'battle', this.battle?.id, this.battle,
      '\n', 'room', this.battleRoom,
    );

    // force a re-syncCalcdex() (via the injected room.battle.subscription()) w/ the new `request` data
    this.battle.subscription('callback');
  }

  protected lockMobileZoom(forceLock?: boolean): void {
    const { overlayVisible } = this.battleState || {};

    if (!this.battle?.calcdexAsOverlay || typeof $ !== 'function') {
      return;
    }

    const $existingMeta = $('meta[data-calcdex*="no-mobile-zoom"]');
    const nextContent = [
      'width=device-width',
      ...(forceLock ?? overlayVisible ? [
        'initial-scale=1',
        'maximum-scale=1',
      ] : ['user-scalable=yes']),
    ].join(',\x20');

    if (!$existingMeta.length) {
      return void $('head').append(`
        <meta
          name="viewport"
          content="${nextContent}"
          data-calcdex="no-mobile-zoom"
        />
      `);
    }

    $existingMeta.attr('content', nextContent);
  }

  protected renderToggleButton(style?: React.CSSProperties, compact?: boolean): Showdown.Preact.VNode {
    const { overlayVisible } = this.battleState || {};

    if (!this.battle?.calcdexAsOverlay) {
      return null;
    }

    const toggleButtonIcon = overlayVisible ? 'close' : 'calculator';
    const toggleButtonLabel = (
      typeof tRef.value === 'function'
        && tRef.value(`calcdex:overlay.control.${overlayVisible ? '' : 'in'}activeLabel`, '')
    ) || `${overlayVisible ? 'Close' : 'Open'} Calcdex`;

    // note: since I'm too lazy to figure out how to get Preact & React to play nicely in JSX-land (probably just adding 'preact' as a dep),
    // we're rendering the Preact manually via the preact.h() (alias of preact.createElement()) function
    // (equivalent to the inline injectToggleButton() helper in the prepareOverlay() method of the CalcdexClassicBootstrapper)
    return preact.h('button', {
      type: 'button',
      class: 'button',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        columnGap: '0.4em',
        ...style,
      },
      name: 'toggleCalcdexOverlay',
      'data-cmd': '/calcdex overlay toggle',
      ...(compact && { title: toggleButtonLabel, 'aria-label': toggleButtonLabel }),
      disabled: !this.battle?.calcdexInit,
    }, ...[
      preact.h('i', { class: cx('fa', `fa-${toggleButtonIcon}`), 'aria-hidden': true }),
      !compact && preact.h('span', null, toggleButtonLabel),
    ].filter(Boolean));
  }

  protected renderCalcdexOverlay(): Showdown.Preact.VNode {
    const { overlayVisible } = this.battleState || {};

    if (!detectPreactHost(window) || !this.battle?.id || !this.battle.calcdexAsOverlay) {
      return null;
    }

    /* l.debug(
      'renderCalcdexOverlay()', 'for', this.battle.id,
      '\n', 'overlayVisible?', overlayVisible,
      '\n', 'battle.calcdexReactRef', this.battle.calcdexReactRef,
      '\n', 'battle.calcdexReactRoot', this.battle.calcdexReactRoot,
      '\n', 'battle.calcdexReactRenderer', '(typeof)', wtf(this.battle.calcdexReactRenderer),
    ); */

    if (!this.battle?.calcdexReactRoot && this.battle?.calcdexReactRef?.current) {
      this.battle.calcdexReactRoot = ReactDOM.createRoot(this.battle.calcdexReactRef.current, {
        identifierPrefix: CalcdexPreactBattlePanel.scope,
      });
    }

    this.battle.calcdexReactRenderer?.();

    return preact.h('div', {
      ref: this.battle?.calcdexReactRef,
      class: styles.overlayContainer,
      ...(!overlayVisible && { style: { display: 'none' } }),
      'data-showdex': 'calcdex',
      'data-calcdex': 'overlay',
    });
  }

  public override renderAfterBattleControls(): Showdown.Preact.VNode {
    // should spit out something like (as a VNode, ofc):
    // <div class="controls">
    //   <p><span style="float: right">...</span><button>...</button>...</p>
    //   <p>...</p>
    // </div>
    const controls = super.renderAfterBattleControls();

    /* l.debug(
      'renderAfterBattleControls()', 'for', this.battle.id,
      '\n', 'controls', controls,
    ); */

    if (!Array.isArray(controls?.props?.children)) {
      return controls;
    }

    const [firstParagraph] = controls.props.children as Showdown.Preact.VNode[];

    if (firstParagraph?.type !== 'p' || !Array.isArray(firstParagraph.props?.children)) {
      return controls;
    }

    const [firstSpan] = firstParagraph.props.children as Showdown.Preact.VNode[];

    if (
      firstSpan?.type !== 'span'
        || (
          !(firstSpan.props as Record<'style', string>)?.style?.includes('float: right')
            && (firstSpan.props as Record<'style', React.CSSProperties>)?.style?.float !== 'right'
        )
        || !Array.isArray(firstSpan.props.children)
    ) {
      return controls;
    }

    (firstSpan.props as Record<'style', React.CSSProperties>).style = {
      float: 'right',
      textAlign: 'right',
    };

    // place the toggle button after the replayDownloadButton
    const replayDownloadButtonIndex = firstSpan.props.children.findIndex((c) => (
      typeof c !== 'string'
        // e.g., { class: 'button replayDownloadButton', href: '//replay.pokemonshowdown.com/download', ... }
        && (c?.props as Record<'class', string>)?.class?.includes('replayDownloadButton')
    ));

    firstSpan.props.children.splice(replayDownloadButtonIndex + 1, 0, this.renderToggleButton({
      marginTop: 1, // alignment fix lol
      [replayDownloadButtonIndex > -1 ? 'marginLeft' : 'marginRight']: 6,
    }));

    return controls;
  }

  public override render() {
    const { room } = this.props;
    const { overlayVisible } = this.battleState || {};

    const panel = super.render();

    if (!this.battle?.calcdexAsOverlay || !panel?.props) {
      return panel;
    }

    // note: you wanna make sure this.renderCalcdexOverlay() comes first (it's absolutely positioned so all g),
    // otherwise some weird shenanigans may occur (when push()'d), like the <Calcdex>'s children[] being rendered inside
    // the .battle-controls-container instead & the <div> housing the <Calcdex> being empty; this requires two presses
    // of the toggle button for the <Calcdex> to visually appear again ... LOL
    panel.props.children = [
      this.renderCalcdexOverlay(),
      ...(Array.isArray(panel.props.children) ? panel.props.children : [panel.props.children]),
    ].filter(Boolean);

    if (overlayVisible) {
      removeNamedPreactChild(panel, 'ChatTextEntry', 2);
    }

    this.lockMobileZoom();

    const { kickingInactive, totalTimeLeft } = this.battle;
    const longTimer = typeof kickingInactive === 'number' && !!kickingInactive && !!totalTimeLeft;

    injectPreactBattleControls(panel, {
      ended: this.battle.ended,
      battleHeight: this.battleHeight,
      timerType: PSTimerButton,
      toggle: (spot, timer) => this.renderToggleButton(null, isCompactPreactToggle(
        spot,
        timer,
        longTimer,
        spot === 'battle-controls' ? Math.round((this.battleHeight * 16) / 9) : room?.width,
      )),
      renderTimer: (timer) => preact.h(CalcdexPreactBattleTimerButton, {
        ...(timer.props as Record<string, unknown>),
        room,
      }),
      renderContainer: (spot, style, children) => preact.h('div', {
        style: {
          ...style,
          display: 'flex',
          alignItems: 'center',
          columnGap: 6,
        },
        'data-showdex': 'calcdex',
        'data-calcdex': 'overlay-controls',
        'data-calcdex-controls': spot === 'battle-options' ? 'battle-options' : 'battle-timer',
      }, ...children),
    });

    return panel;
  }
}
