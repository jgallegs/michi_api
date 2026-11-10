import React from 'react';
import GitSection, { GIT_TAB_TYPE, GitTab, GitTabTitle } from 'components/fork/SourceControl';
import FlowsSection from 'components/fork/Flows';
import FlowTab from 'components/fork/Flows/FlowTab';
import FlowTabTitle from 'components/fork/Flows/FlowTabTitle';
import { isFlowTabType } from 'components/fork/Flows/selection';

// Everything the fork adds to the sidebar and to the tab strip. Bruno's files only reach this module,
// so a new section or tab type does not need a new hook.
export const FORK_SIDEBAR_SECTIONS = [
  { id: 'git', component: GitSection },
  { id: 'flows', component: FlowsSection }
];

const FORK_TABS = [
  { matches: (type) => type === GIT_TAB_TYPE, Panel: GitTab, Title: GitTabTitle },
  { matches: isFlowTabType, Panel: FlowTab, Title: FlowTabTitle }
];

const findForkTab = (type) => FORK_TABS.find((forkTab) => forkTab.matches(type));

export const isForkTab = (type) => Boolean(findForkTab(type));

export const forkSpecialTabTypes = (type) => (isForkTab(type) ? [type] : []);

export const ForkTabPanel = ({ tab, collection }) => {
  const { Panel } = findForkTab(tab.type);
  return <Panel tab={tab} collection={collection} />;
};

export const ForkTabTitle = ({ type }) => {
  const { Title } = findForkTab(type);
  return <Title type={type} />;
};
