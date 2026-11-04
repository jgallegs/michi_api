import React from 'react';
import { IconGitBranch } from '@tabler/icons';

// Tab header for the Git tab, in the same shape as the other special tabs.
const GitTabTitle = () => (
  <>
    <IconGitBranch size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
    <span className="ml-1 tab-name">Git</span>
  </>
);

export default GitTabTitle;
