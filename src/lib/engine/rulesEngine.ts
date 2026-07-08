import { ActivityEvent, HandlerOutput, PlayerState } from './types';

export type EventHandler = (event: ActivityEvent, state: PlayerState) => HandlerOutput;

/**
 * The Rules Engine itself is deliberately dumb: it just runs an ordered list
 * of handlers, threading state through each one and collecting their change
 * logs. All game-design logic lives in the handlers, not here - that's what
 * keeps this class stable while everything else (quests, achievements, skill
 * trees, in later phases) gets added as new handlers, never as edits to this
 * file.
 */
export class RulesEngine {
  private handlers: EventHandler[] = [];

  registerHandler(handler: EventHandler): this {
    this.handlers.push(handler);
    return this;
  }

  processEvent(event: ActivityEvent, state: PlayerState): HandlerOutput {
    let currentState = state;
    const allChanges: HandlerOutput['changes'] = [];

    for (const handler of this.handlers) {
      const result = handler(event, currentState);
      currentState = result.state;
      allChanges.push(...result.changes);
    }

    return {
      state: { ...currentState, activityLog: [...currentState.activityLog, event] },
      changes: allChanges,
    };
  }
}
