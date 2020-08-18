import React, { useState, Fragment } from 'react';
import { useForm } from 'react-hook-form';

import DatePicker from "react-datepicker";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';

import "react-datepicker/dist/react-datepicker.css";

import {
  Row, Col, Button,
  FormGroup, Form, Input, Label,
  Tooltip
} from 'reactstrap';

import PaymentAmountInput from './PaymentAmountInput';

import '../assets/css/themify-icons.css';
import '../assets/css/style.scss';

const DestinationEmailField = (props) => {
  const {
    register,
    errors
  } = props;

  return (
    <Fragment>
      <Label for="recipientEmail">Destination email <span className="text-danger">*</span></Label>
      <Input
        type="text"
        name="recipientEmail"
        id="recipientEmail"
        innerRef={register({
          required: 'Mandatory field',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        })}
      />
      <span className="text-danger small">{errors.recipientEmail && errors.recipientEmail.message}</span>
    </Fragment>
  )
}

const SenderEmailField = (props) => {
  const {
    register,
    errors
  } = props;

  const [tooltipOpen, setTooltipOpen] = useState(false);

  const toggleTooltip = () => setTooltipOpen(!tooltipOpen);

  return (
    <Fragment>
      <Label for="senderEmail">Your email <FontAwesomeIcon icon={faInfoCircle} size="xs" id="senderEmailTooltip" /> <span className="text-danger">*</span></Label>
      <Tooltip placement="right" isOpen={tooltipOpen} target="senderEmailTooltip" toggle={toggleTooltip}>
        We'll send you a receipt of the payment and a link to reclaim your funds if you choose an expiration date.
      </Tooltip>
      <Input
        type="text"
        name="senderEmail"
        id="senderEmail"
        innerRef={register({
          required: 'Mandatory field',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address'
          }
        })}
      />
      <span className="text-danger small">{errors.senderEmail && errors.senderEmail.message}</span>
    </Fragment>
  )
}

const FeesField = (props) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const toggleTooltip = () => setTooltipOpen(!tooltipOpen);

  return (
    <Fragment>
      <p className="small">Fees: 1% of the total amount sent (minimum fee: 546 satoshis) plus network fees <FontAwesomeIcon icon={faInfoCircle} size="xs" id="feesTooltip" />.</p>
      <Tooltip placement="right" isOpen={tooltipOpen} target="feesTooltip" toggle={toggleTooltip}>
        Includes the network fees needed to redeem the recipient's transaction.
      </Tooltip>
    </Fragment>
  )
}

const ExpirationDateField = (props) => {
  const {
    register,
    errors
  } = props;

  const [date, setDate] = useState(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const onChangeIgnore = () => {}
  
  const toggleTooltip = () => setTooltipOpen(!tooltipOpen);

  const dateValue = date ? date.toISOString() : '';
  
  return (
    <Fragment>
      <Label for="expirationDate">Expiration date <FontAwesomeIcon icon={faInfoCircle} size="xs" id="expirationDateTooltip" /> <span className="text-danger">*</span></Label><br />
      <Tooltip placement="right" isOpen={tooltipOpen} target="expirationDateTooltip" toggle={toggleTooltip}>
        If the recipient doesn't claim the funds, you'll be able to get your money back after this date.
      </Tooltip>
      <DatePicker
        selected={date}
        minDate={new Date()}
        onChange={(date) => setDate(date)}
        showTimeSelect
        dateFormat="Pp"
        className="form-control"
      />
      <Input
        type="hidden"
        id="expirationDate"
        name="expirationDate"
        value={dateValue}
        onChange={onChangeIgnore}
        innerRef={register({
          required: 'Mandatory field'
        })}
      /><br />
      {errors.expirationDate &&
        <Fragment>
          <span className="text-danger small">{errors.expirationDate.message}</span><br />
        </Fragment>
      }
    </Fragment>
  )
}

const NewPaymentForm = (props) => {
  const { onSubmit } = props;
  
  const { register, errors, trigger, handleSubmit } = useForm({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const [expirationDateSelected, SetExpirationDateSelected] = useState(false);

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <PaymentAmountInput
        initialCurrency='usd'
        initialAmount={0}
        form={{errors, trigger}}
        register={register}
      />
      <Row className="mt-5 m-2">
        <Col className="col-md-10 col-xl-10 col-12 text-left mx-auto">
          <FormGroup>
            <DestinationEmailField register={register} errors={errors} />
          </FormGroup>
          <FormGroup>
            <SenderEmailField register={register} errors={errors} />
          </FormGroup>
          <FormGroup>
            {expirationDateSelected &&
              <ExpirationDateField register={register} errors={errors} />
            }
            <Button color="link" className="p-0" onClick={(e) => SetExpirationDateSelected(!expirationDateSelected)}><span className="small">{expirationDateSelected ? 'Remove' : 'Add'} expiration date</span></Button>
          </FormGroup>
          <FeesField />
          <FormGroup className="pl-4">
            <Input
              type="checkbox"
              name="agreePrivacyPolicyAndTCs"
              innerRef={register({
                required: "You must agree to the platform's Privacy Policy and Terms & Conditions"
              })}
            /> <span className="small">
              I have read and agree to the platform's&nbsp;
              <a href="https://mypaymail.co/privacy_policy" rel="noopener noreferrer" target="_blank">Privacy Policy</a> and&nbsp;
              <a href="https://mypaymail.co/terms_and_conditions" rel="noopener noreferrer" target="_blank">Terms & Conditions</a></span>.
            <br />
            <span className="text-danger small">{errors.agreePrivacyPolicyAndTCs && errors.agreePrivacyPolicyAndTCs.message}</span>
          </FormGroup>
          <FormGroup className="mt-4 d-flex justify-content-start">
            <Button className="button" type="submit">Send payment</Button>
          </FormGroup>
        </Col>
      </Row>
    </Form>
  );
}

export default NewPaymentForm;
