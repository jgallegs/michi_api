import React from 'react';
import RequestHistoryButton from 'components/fork/RequestHistory';
import QrCodeButton from 'components/fork/QrCode';

// The fork's buttons in the status bar (one hook, H-26).
const ForkStatusBarItems = () => (
  <>
    <RequestHistoryButton />
    <QrCodeButton />
  </>
);

export default ForkStatusBarItems;
