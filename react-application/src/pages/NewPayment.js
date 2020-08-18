import React, { useState, Fragment, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import {
  Button,
  Form, FormGroup, Input
} from 'reactstrap';

import { DateTime } from 'luxon';

import Loading from '../components/Loading';
import UserMessage from '../components/UserMessage';
import Checkout from '../components/Checkout';
import NewPaymentForm from '../components/NewPaymentForm';

import Wallet from '../libs/wallet';
import Payment from '../libs/payment';

import '../assets/css/themify-icons.css';
import '../assets/css/style.scss';

const PaymentCompleted = (props) => {
  const {
    wallet,
    payment,
    onClearSessionClicked
  } = props;

  const { register, errors, handleSubmit } = useForm();

  const [showUnlockingCode, setShowUnlockingCode] = useState(false);

  const onSubmit = (data) => {
    onClearSessionClicked();
  }

  return (
    <div className="mt-2">
      <h3 className="text-center">Payment successful!</h3>
      <p className="mt-4">You're almost done. Share the following <strong>payment unlocking code</strong> with the recipient to complete the payment.</p>
      {showUnlockingCode
        ?
          <Fragment>
            <p className="mt-2 text-center"><Button color="link" className="m-0 p-0" onClick={(e) => setShowUnlockingCode(false)}>Hide payment unlocking code</Button></p>
            <div className="alert alert-secondary p-4" role="alert">
              <h4 className="mb-0 text-center">
                <strong>{wallet.randomWords.slice(0, 3).join(' - ')}</strong>
                <br />
                <strong>{wallet.randomWords.slice(3, 5).join(' - ')}</strong>
              </h4>
            </div>
          </Fragment>
        : 
          <p className="mt-2 text-center"><Button className="btn btn-secondary" onClick={(e) => setShowUnlockingCode(true)}>Show payment unlocking code</Button></p>
      }
      <p className="mt-4">We've sent you an email to <strong>{payment.senderEmail}</strong> with a receipt of the payment.
        {payment.expirationDate !== undefined &&
          <span>&nbsp;If the recipient doesn't reedem the payment, you can reclaim your money after <strong>{payment.expirationDate.toLocaleString(DateTime.DATETIME_MED)}</strong>, using the payment unlocking code. Simply click on the link that we've emailed to you and follow the instructions.</span>
        }
      </p>
      <p className="mt-4">
        In case you need to contact us, please cite the following payment reference: <br />
        <strong>{payment.uuid}</strong>
      </p>
      <p className="mt-4">
        We'll keep showing this page in your browser until you confirm that you've written down all the payment details. Please tick the box below to clear your session.
      </p>
      <Form onSubmit={handleSubmit(onSubmit)} className="mt-4">
        <FormGroup className="pl-4">
          <Input
            type="checkbox"
            name="paymentDetailsSaved"
            innerRef={register({
              required: "Please acknowledge that you've written down your payment details"
            })}
          /> I've written down my payment details<br />
          <span className="text-danger small">{errors.paymentDetailsSaved && errors.paymentDetailsSaved.message}</span>
        </FormGroup>
        <FormGroup className="mt-4 p-0">
          <p>
            <Button className="button" type="submit">Clear my session</Button>
          </p>
        </FormGroup>
      </Form>
    </div>
  );
}

const NewPayment = () => {
  const [wallet, setWallet] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userMessage, setUserMessage] = useState(null);
  const [formData, setFormData] = useState(null);
  const [payment, setPayment] = useState(null);

  const onPaymentSent = (payment, rawTx, memo) => {
    setPayment(payment);
  }

  const onError = (errorMessage) => {
    setUserMessage({
      text: errorMessage,
      error: true
    });
  }

  const clearSession = () => {
    setFormData(null);

    wallet.deleteFromLocalStorage();
    payment.deleteFromLocalStorage();

    setWallet(null);
    setPayment(null);

    setUserMessage({
      title: 'All done!',
      text: (
        <Fragment>
          <p>Your session has been safely cleared.</p>
          <p>Click <a href="/">here</a> if you want to make a new payment.</p>
        </Fragment>
      )
    });
  }

  const newSession = async () => {
    const _wallet = Wallet.fromLocalStorage();

    _wallet.saveToLocalStorage();

    setWallet(_wallet);

    const _payment = Payment.fromLocalStorage();

    if (_payment) {
      setPayment(_payment);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    newSession();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center">
        <Loading bgcolor="#fff" opacity={1} />
      </div>
    );
  }

  if (userMessage !== null) {
    return (
      <UserMessage message={userMessage} />
    )
  }

  let paymentCompleted = false;

  if ((payment !== null) && (payment.state === 'COMPLETED')) {
    paymentCompleted = true;
  }

  if (wallet === null) {
    return '';
  }

  return (
    <Fragment>
      <div className="alert alert-danger" role="alert">
        <p className="text-danger text-center p-0 m-0">This page is for demonstration purposes only.</p>
      </div>
      {paymentCompleted
        ?
          <PaymentCompleted
            wallet={wallet}
            payment={payment}
            onClearSessionClicked={clearSession}
          />
        :
          <div className="text-center">
            {(formData !== null)
              ?
                <Checkout
                  senderEmail={formData.senderEmail}
                  recipientEmail={formData.recipientEmail}
                  wallet={wallet}
                  currency={formData.currency}
                  amount={formData.amount}
                  expirationDate={formData.expirationDate}
                  onPaymentSent={onPaymentSent}
                  onError={onError}
                />
              :
                <NewPaymentForm onSubmit={(data) => setFormData(data)} />
            }
          </div>
      }
    </Fragment>
  );
}

export default NewPayment;
