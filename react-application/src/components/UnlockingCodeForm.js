import React from 'react';
import { useForm } from 'react-hook-form';

import {
  FormGroup,
  Label,
  Input,
  Form,
  Button,
  Row,
  Col
} from 'reactstrap';

const UnlockingCodeForm = (props) => {
  const { register, errors, handleSubmit } = useForm();

  const { onWordsIntroduced } = props;

  const onSubmit = data => {
    onWordsIntroduced(data.words);
  };

  const formLabels = [
    '1st word', '2nd word',
    '3rd word', '4th word',
    '5th word'
  ];

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <h4 className="text-center">Enter your unlocking code:</h4>
      <div className="mt-4">
        <Row>
          <Col className="col-12 col-md-10 mx-auto">
            <FormGroup>
              <Row>
                <Row className="d-flex flex-row justify-content-center mx-auto">
                  {formLabels.map((label, wordNum) =>
                    <Col className="mb-2 text-center col-4" key={wordNum}>
                      <Label for={`words[${wordNum}]`} className="small">{label}</Label>
                      <Input
                        type="password"
                        style={{'text-align': 'center'}}
                        name={`words[${wordNum}]`}
                        innerRef={register({
                          required: "Mandatory",
                          pattern: {
                            value: /^[a-zA-Z]+$/,
                            message: "Invalid format"
                          }
                        })}
                      />
                      {errors.words && errors?.words[`${wordNum}`] &&
                        <p className="text-danger small">{errors.words[`${wordNum}`].message}</p>
                      }
                    </Col>
                  )}
                </Row>
              </Row>
            </FormGroup>
            <FormGroup>
              <div className="d-flex flex-row justify-content-center mt-4">
                <Button className="button" type="submit">Continue</Button>
              </div>
            </FormGroup>
          </Col>
        </Row>
      </div>
    </Form>
  );
}

export default UnlockingCodeForm;
