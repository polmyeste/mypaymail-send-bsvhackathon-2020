import React from 'react';
import ReactDOM from 'react-dom';

import { BrowserRouter, Route, Switch } from 'react-router-dom';

import PageContainer from './components/PageContainer';

import NewPaymentPage from './pages/NewPayment';
import RedeemPaymentPage from './pages/RedeemPayment';
import ReclaimPaymentPage from './pages/ReclaimPayment';

import { ClientDataProvider } from './client-data';

import * as serviceWorker from './serviceWorker';

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Switch>
        <Route exact path={'/'} render={(props) => <PageContainer Component={NewPaymentPage} />} />
        <Route path={'/redeem'} render={(props) => <ClientDataProvider><PageContainer Component={RedeemPaymentPage} /></ClientDataProvider>} />
        <Route path={'/reclaim'} render={(props) => <ClientDataProvider><PageContainer Component={ReclaimPaymentPage} /></ClientDataProvider>} />
      </Switch>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
