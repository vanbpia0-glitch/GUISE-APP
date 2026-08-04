import type {
  AppState,
  Block,
  Blocker,
  GuiseContext,
  GuiseSystem,
  Goal,
  Reflection,
  Target,
  TargetLogEntry,
  WorkSession,
} from '../types';
import { makeId } from '../lib/id';
import { quarterLabel, startOfWeek, addDays } from '../lib/date';

function iso(d: Date): string {
  return d.toISOString();
}

function atTime(day: Date, hh: number, mm: number): Date {
  const d = new Date(day);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/**
 * Builds a fresh starter dataset anchored to "now" so Today's blocks, this
 * week's completed hours, and target log dates all read as current. Only
 * used the very first time the app runs (see persistence.ts) — real data
 * always wins once it exists.
 */
export function buildSeedState(): AppState {
  const now = new Date();
  const q = quarterLabel(now);
  const thisMonday = startOfWeek(now);
  const lastMonday = addDays(thisMonday, -7);

  const contexts: GuiseContext[] = [
    {
      id: makeId('ctx'),
      name: 'SC',
      role_description: 'Head of Creatives role',
      color_key: 'orange',
      icon: 'briefcase',
      sort_order: 0,
      active: true,
      created_at: iso(now),
    },
    {
      id: makeId('ctx'),
      name: 'Grounds Studio',
      role_description: 'Creative studio, w/ Paul',
      color_key: 'green',
      icon: 'plant',
      sort_order: 1,
      active: true,
      created_at: iso(now),
    },
    {
      id: makeId('ctx'),
      name: 'Van',
      role_description: 'Personal brand',
      color_key: 'yellow',
      icon: 'user-star',
      sort_order: 2,
      active: true,
      created_at: iso(now),
    },
    {
      id: makeId('ctx'),
      name: 'Me',
      role_description: 'Personal / just-because',
      color_key: 'purple',
      icon: 'heart',
      sort_order: 3,
      active: true,
      created_at: iso(now),
    },
    {
      id: makeId('ctx'),
      name: 'Side hustle',
      role_description: 'Paused — merged into SC',
      color_key: 'yellow',
      icon: 'bulb',
      sort_order: 4,
      active: false,
      archived_at: iso(addDays(now, -20)),
      created_at: iso(addDays(now, -120)),
    },
  ];
  const [sc, grounds, van, me] = contexts;

  const goals: Goal[] = [
    {
      id: makeId('goal'),
      context_id: sc.id,
      title: 'SC digital LOB traction',
      why: 'Prove the digital line of business can stand on its own before year-end review.',
      why_type: 'pull',
      quarter: q,
      status: 'active',
      priority_order: 0,
      created_at: iso(now),
    },
    {
      id: makeId('goal'),
      context_id: grounds.id,
      title: 'Grounds Studio momentum',
      why: 'Get the studio to a place where it feels real, not just a side thing.',
      why_type: 'pull',
      quarter: q,
      status: 'active',
      priority_order: 1,
      created_at: iso(now),
    },
    {
      id: makeId('goal'),
      context_id: van.id,
      title: 'Van, personal brand',
      why: "Build a presence because it feels like the thing I 'should' be doing.",
      why_type: 'push',
      quarter: q,
      status: 'active',
      priority_order: 2,
      created_at: iso(now),
    },
    {
      id: makeId('goal'),
      context_id: me.id,
      title: 'Protect time w/ Paul',
      why: 'The friendship is the actual reason Grounds is fun — protect it deliberately.',
      why_type: 'pull',
      quarter: q,
      status: 'active',
      priority_order: 3,
      created_at: iso(now),
    },
  ];
  const [scGoal, groundsGoal, vanGoal, paulGoal] = goals;

  const blockers: Blocker[] = [
    {
      id: makeId('blk'),
      goal_id: groundsGoal.id,
      description: 'Not enough inbound leads for Grounds specifically',
      category: 'somewhat_in_control',
      status: 'open',
      created_at: iso(now),
    },
    {
      id: makeId('blk'),
      goal_id: groundsGoal.id,
      description: "Worried people think it's \"just a side thing\"",
      category: 'not_in_control',
      status: 'open',
      created_at: iso(now),
    },
  ];

  const systems: GuiseSystem[] = [
    {
      id: makeId('sys'),
      context_id: me.id,
      title: 'Gym',
      domain: 'health',
      recurrence_rule: 'Mon,Wed,Fri',
      energizer_type: 'power',
      linked_goal_id: vanGoal.id,
      active: true,
      created_at: iso(now),
    },
    {
      id: makeId('sys'),
      context_id: me.id,
      title: 'Date night',
      domain: 'relationships',
      recurrence_rule: 'Sun',
      energizer_type: 'people',
      active: true,
      created_at: iso(now),
    },
    {
      id: makeId('sys'),
      context_id: van.id,
      title: 'Van posting',
      domain: 'work',
      recurrence_rule: 'Tue,Fri',
      energizer_type: 'play',
      linked_goal_id: vanGoal.id,
      active: true,
      created_at: iso(now),
    },
    {
      id: makeId('sys'),
      context_id: sc.id,
      title: 'Content posting',
      domain: 'work',
      recurrence_rule: 'Mon,Wed,Fri',
      energizer_type: 'power',
      active: true,
      created_at: iso(now),
    },
    {
      id: makeId('sys'),
      title: 'Paycheck auto-split',
      domain: 'finance',
      rule_description: 'Savings, investing, tax, and bills split automatically each payday.',
      energizer_type: 'power',
      active: true,
      created_at: iso(now),
    },
    {
      id: makeId('sys'),
      context_id: me.id,
      title: 'Sleep environment',
      domain: 'health',
      rule_description: '19°C, no phone, morning sunlight — the default, no exceptions.',
      energizer_type: 'power',
      active: true,
      created_at: iso(now),
    },
    {
      id: makeId('sys'),
      context_id: me.id,
      title: 'Tuesday takeout',
      domain: 'relationships',
      rule_description: "No cooking on Tuesdays. That's the whole rule.",
      energizer_type: 'play',
      active: true,
      created_at: iso(now),
    },
  ];
  const [gymSys, dateNightSys, vanPostingSys, contentPostingSys] = systems;

  const blocks: Block[] = [];
  const workSessions: WorkSession[] = [];

  function addBlock(b: Omit<Block, 'id' | 'created_at'>, sessionMinutes?: number) {
    const block: Block = { ...b, id: makeId('block'), created_at: iso(now) };
    blocks.push(block);
    if (sessionMinutes && block.completed_at) {
      const started = new Date(block.scheduled_start);
      const ended = new Date(started.getTime() + sessionMinutes * 60000);
      workSessions.push({
        id: makeId('sess'),
        block_id: block.id,
        started_at: iso(started),
        ended_at: iso(ended),
        duration_minutes: sessionMinutes,
      });
    }
    return block;
  }

  // --- Last week: fully in the past, all completed ---
  const lastMon = lastMonday;
  const lastWed = addDays(lastMonday, 2);
  const lastThu = addDays(lastMonday, 3);
  const lastFri = addDays(lastMonday, 4);
  const lastSat = addDays(lastMonday, 5);
  const lastSun = addDays(lastMonday, 6);

  addBlock(
    {
      title: 'Gym',
      context_id: me.id,
      system_id: gymSys.id,
      source_type: 'system',
      scheduled_start: iso(atTime(lastMon, 7, 0)),
      scheduled_end: iso(atTime(lastMon, 7, 45)),
      is_todays_adventure: false,
      motivation_type: 'power',
      completed_at: iso(atTime(lastMon, 7, 45)),
    },
    45
  );
  addBlock(
    {
      title: 'SC proposal deep work',
      context_id: sc.id,
      goal_id: scGoal.id,
      source_type: 'goal',
      scheduled_start: iso(atTime(lastMon, 9, 0)),
      scheduled_end: iso(atTime(lastMon, 11, 0)),
      is_todays_adventure: false,
      motivation_type: 'power',
      completed_at: iso(atTime(lastMon, 11, 0)),
    },
    120
  );
  addBlock(
    {
      title: 'Grounds Studio catch-up',
      context_id: grounds.id,
      goal_id: groundsGoal.id,
      source_type: 'goal',
      scheduled_start: iso(atTime(lastMon, 16, 0)),
      scheduled_end: iso(atTime(lastMon, 17, 0)),
      is_todays_adventure: false,
      completed_at: iso(atTime(lastMon, 17, 0)),
    },
    60
  );
  addBlock(
    {
      title: 'SC content batch',
      context_id: sc.id,
      system_id: contentPostingSys.id,
      source_type: 'system',
      scheduled_start: iso(atTime(lastWed, 15, 0)),
      scheduled_end: iso(atTime(lastWed, 16, 30)),
      is_todays_adventure: false,
      motivation_type: 'power',
      completed_at: iso(atTime(lastWed, 16, 30)),
    },
    90
  );
  addBlock(
    {
      title: 'Draft LinkedIn post',
      context_id: van.id,
      system_id: vanPostingSys.id,
      source_type: 'system',
      scheduled_start: iso(atTime(lastWed, 9, 0)),
      scheduled_end: iso(atTime(lastWed, 9, 30)),
      is_todays_adventure: false,
      motivation_type: 'play',
      completed_at: iso(atTime(lastWed, 9, 30)),
    },
    30
  );
  addBlock(
    {
      title: 'Grounds admin',
      context_id: grounds.id,
      goal_id: groundsGoal.id,
      source_type: 'goal',
      scheduled_start: iso(atTime(lastThu, 10, 0)),
      scheduled_end: iso(atTime(lastThu, 11, 0)),
      is_todays_adventure: false,
      completed_at: iso(atTime(lastThu, 11, 0)),
    },
    60
  );
  addBlock(
    {
      title: 'Client call prep',
      context_id: sc.id,
      goal_id: scGoal.id,
      source_type: 'goal',
      scheduled_start: iso(atTime(lastFri, 11, 0)),
      scheduled_end: iso(atTime(lastFri, 12, 0)),
      is_todays_adventure: false,
      motivation_type: 'power',
      completed_at: iso(atTime(lastFri, 12, 0)),
    },
    60
  );
  addBlock(
    {
      title: 'Post LinkedIn',
      context_id: van.id,
      system_id: vanPostingSys.id,
      source_type: 'system',
      scheduled_start: iso(atTime(lastFri, 17, 0)),
      scheduled_end: iso(atTime(lastFri, 17, 30)),
      is_todays_adventure: false,
      motivation_type: 'play',
      completed_at: iso(atTime(lastFri, 17, 30)),
    },
    30
  );
  addBlock(
    {
      title: 'Long run',
      context_id: me.id,
      source_type: 'adhoc',
      scheduled_start: iso(atTime(lastSat, 8, 0)),
      scheduled_end: iso(atTime(lastSat, 9, 0)),
      is_todays_adventure: false,
      motivation_type: 'play',
      completed_at: iso(atTime(lastSat, 9, 0)),
    },
    60
  );
  addBlock(
    {
      title: 'Date night',
      context_id: me.id,
      system_id: dateNightSys.id,
      source_type: 'system',
      scheduled_start: iso(atTime(lastSun, 19, 0)),
      scheduled_end: iso(atTime(lastSun, 20, 30)),
      is_todays_adventure: false,
      motivation_type: 'people',
      completed_at: iso(atTime(lastSun, 20, 30)),
    },
    90
  );

  // --- This week: only days up to & including today are "in the past" ---
  const monday = thisMonday;
  const wednesday = addDays(thisMonday, 2);
  const thursday = addDays(thisMonday, 3);
  const friday = addDays(thisMonday, 4);

  if (monday.getTime() < now.getTime()) {
    addBlock(
      {
        title: 'Gym',
        context_id: me.id,
        system_id: gymSys.id,
        source_type: 'system',
        scheduled_start: iso(atTime(monday, 7, 0)),
        scheduled_end: iso(atTime(monday, 7, 45)),
        is_todays_adventure: false,
        motivation_type: 'power',
        completed_at: iso(atTime(monday, 7, 45)),
      },
      45
    );
    addBlock(
      {
        title: 'SC proposal follow-up',
        context_id: sc.id,
        goal_id: scGoal.id,
        source_type: 'goal',
        scheduled_start: iso(atTime(monday, 9, 0)),
        scheduled_end: iso(atTime(monday, 10, 30)),
        is_todays_adventure: false,
        motivation_type: 'power',
        completed_at: iso(atTime(monday, 10, 30)),
      },
      90
    );
  }

  // Today: exactly one is_todays_adventure block.
  addBlock({
    title: 'SC content review',
    context_id: sc.id,
    goal_id: scGoal.id,
    source_type: 'goal',
    scheduled_start: iso(atTime(now, 14, 0)),
    scheduled_end: iso(atTime(now, 15, 0)),
    is_todays_adventure: true,
    motivation_type: 'power',
  });
  addBlock({
    title: 'Grounds check-in',
    context_id: grounds.id,
    goal_id: groundsGoal.id,
    source_type: 'goal',
    scheduled_start: iso(atTime(now, 18, 0)),
    scheduled_end: iso(atTime(now, 18, 30)),
    is_todays_adventure: false,
  });
  addBlock({
    title: 'Post LinkedIn',
    context_id: van.id,
    system_id: vanPostingSys.id,
    source_type: 'system',
    scheduled_start: iso(atTime(now, 20, 0)),
    scheduled_end: iso(atTime(now, 20, 20)),
    is_todays_adventure: false,
    motivation_type: 'play',
  });

  // Rest of this week: scheduled, not yet completed.
  if (wednesday.getTime() > now.getTime()) {
    addBlock({
      title: 'SC content batch',
      context_id: sc.id,
      system_id: contentPostingSys.id,
      source_type: 'system',
      scheduled_start: iso(atTime(wednesday, 15, 0)),
      scheduled_end: iso(atTime(wednesday, 16, 30)),
      is_todays_adventure: false,
      motivation_type: 'power',
    });
  }
  if (thursday.getTime() > now.getTime()) {
    addBlock({
      title: 'Grounds admin',
      context_id: grounds.id,
      goal_id: groundsGoal.id,
      source_type: 'goal',
      scheduled_start: iso(atTime(thursday, 10, 0)),
      scheduled_end: iso(atTime(thursday, 11, 0)),
      is_todays_adventure: false,
    });
  }
  if (friday.getTime() > now.getTime()) {
    addBlock({
      title: 'Client call prep',
      context_id: sc.id,
      goal_id: scGoal.id,
      source_type: 'goal',
      scheduled_start: iso(atTime(friday, 11, 0)),
      scheduled_end: iso(atTime(friday, 12, 0)),
      is_todays_adventure: false,
      motivation_type: 'power',
    });
    addBlock({
      title: 'Post LinkedIn',
      context_id: van.id,
      system_id: vanPostingSys.id,
      source_type: 'system',
      scheduled_start: iso(atTime(friday, 17, 0)),
      scheduled_end: iso(atTime(friday, 17, 30)),
      is_todays_adventure: false,
      motivation_type: 'play',
    });
  }

  const targets: Target[] = [
    {
      id: makeId('tgt'),
      title: 'Read 12 books',
      context_id: me.id,
      metric_unit: 'books',
      goal_amount: 12,
      current_amount: 7,
      timeframe: 'year',
      timeframe_label: `${now.getFullYear()}`,
      status: 'active',
      created_at: iso(now),
    },
    {
      id: makeId('tgt'),
      title: '48 brand posts',
      context_id: van.id,
      linked_system_id: vanPostingSys.id,
      metric_unit: 'posts',
      goal_amount: 48,
      current_amount: 34,
      timeframe: 'year',
      timeframe_label: `${now.getFullYear()}`,
      status: 'active',
      created_at: iso(now),
    },
    {
      id: makeId('tgt'),
      title: '100km run',
      context_id: me.id,
      metric_unit: 'km',
      goal_amount: 100,
      current_amount: 32,
      timeframe: 'quarter',
      timeframe_label: q,
      status: 'active',
      created_at: iso(now),
    },
    {
      id: makeId('tgt'),
      title: '20 client sessions',
      context_id: sc.id,
      metric_unit: 'sessions',
      goal_amount: 20,
      current_amount: 9,
      timeframe: 'quarter',
      timeframe_label: q,
      status: 'active',
      created_at: iso(now),
    },
    {
      id: makeId('tgt'),
      title: '52 studio uploads',
      context_id: grounds.id,
      metric_unit: 'uploads',
      goal_amount: 52,
      current_amount: 38,
      timeframe: 'year',
      timeframe_label: `${now.getFullYear()}`,
      status: 'active',
      created_at: iso(now),
    },
    {
      id: makeId('tgt'),
      title: '10 new pitches',
      context_id: sc.id,
      metric_unit: 'pitches',
      goal_amount: 10,
      current_amount: 6,
      timeframe: 'year',
      timeframe_label: `${now.getFullYear()}`,
      status: 'active',
      created_at: iso(now),
    },
    {
      id: makeId('tgt'),
      title: '365 meditation days',
      context_id: me.id,
      metric_unit: 'days',
      goal_amount: 365,
      current_amount: 208,
      timeframe: 'year',
      timeframe_label: `${now.getFullYear()}`,
      status: 'active',
      created_at: iso(now),
    },
    {
      id: makeId('tgt'),
      title: '30 gym sessions',
      context_id: grounds.id,
      metric_unit: 'sessions',
      goal_amount: 30,
      current_amount: 22,
      timeframe: 'quarter',
      timeframe_label: q,
      status: 'active',
      created_at: iso(now),
    },
    {
      id: makeId('tgt'),
      title: '15 date nights',
      context_id: me.id,
      metric_unit: 'nights',
      goal_amount: 15,
      current_amount: 5,
      timeframe: 'quarter',
      timeframe_label: q,
      status: 'active',
      created_at: iso(now),
    },
    {
      id: makeId('tgt'),
      title: '25 outreach calls',
      context_id: van.id,
      metric_unit: 'calls',
      goal_amount: 25,
      current_amount: 19,
      timeframe: 'quarter',
      timeframe_label: q,
      status: 'active',
      created_at: iso(now),
    },
    {
      id: makeId('tgt'),
      title: '6 short films',
      context_id: van.id,
      metric_unit: 'films',
      goal_amount: 6,
      current_amount: 6,
      timeframe: 'year',
      timeframe_label: `${now.getFullYear()}`,
      status: 'achieved',
      created_at: iso(now),
    },
  ];
  const [booksTarget] = targets;

  const targetLogEntries: TargetLogEntry[] = [
    {
      id: makeId('tlog'),
      target_id: booksTarget.id,
      amount: 1,
      source: 'manual',
      logged_at: iso(addDays(now, -5)),
    },
    {
      id: makeId('tlog'),
      target_id: booksTarget.id,
      amount: 1,
      source: 'manual',
      logged_at: iso(addDays(now, -13)),
    },
    {
      id: makeId('tlog'),
      target_id: booksTarget.id,
      amount: 2,
      source: 'manual',
      logged_at: iso(addDays(now, -26)),
    },
  ];

  const reflections: Reflection[] = [
    {
      id: makeId('refl'),
      week_of: iso(lastMonday),
      mood: 'okay',
      biggest_win: 'Closed the OPVS brand kit and got Danding onboarded.',
      per_context_notes: [
        {
          context_id: sc.id,
          note: 'Proposal draft stalled — need Joey\'s input on scope before I can move.',
        },
      ],
      next_focus: "Get Joey's input on Grounds scope, book date night.",
      created_at: iso(lastSun),
    },
  ];

  const state: AppState = {
    contexts: Object.fromEntries(contexts.map((c) => [c.id, c])),
    goals: Object.fromEntries(goals.map((g) => [g.id, g])),
    blockers: Object.fromEntries(blockers.map((b) => [b.id, b])),
    blocks: Object.fromEntries(blocks.map((b) => [b.id, b])),
    workSessions: Object.fromEntries(workSessions.map((s) => [s.id, s])),
    systems: Object.fromEntries(systems.map((s) => [s.id, s])),
    reflections: Object.fromEntries(reflections.map((r) => [r.id, r])),
    targets: Object.fromEntries(targets.map((t) => [t.id, t])),
    targetLogEntries: Object.fromEntries(targetLogEntries.map((t) => [t.id, t])),
    activeTimerBlockId: null,
  };

  // Silence unused-var lint for goals referenced only for id wiring above.
  void paulGoal;

  return state;
}
