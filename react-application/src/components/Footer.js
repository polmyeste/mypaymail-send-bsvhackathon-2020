import React from 'react';

import { Container } from 'reactstrap';

const Footer = () => {
  return (
    <div id="footer">
      <Container>
        <div className="row mt-4">
          <div className="col-lg-4 text-lg-left text-center mb-4 mb-lg-0">
            <ul className="list-inline social-icon mb-0">
              
              <li className="list-inline-item"><a href="https://twitter.com/myPaymail"><i className="ti-twitter-alt"></i></a></li>
              
              <li className="list-inline-item"><a href="mailto:support@trustchair.com"><i className="ti-email"></i></a></li>
              
            </ul>
          </div>
        </div>
        <div className="mt-3">
          <p className="small">
            © 2020 Trustchair Ltd All Rights Reserved | Address: 86-90 Paul Street, London, United Kingdom, EC2A 4NE. <br />
            <a href="https://mypaymail.co/terms_and_conditions" rel="noopener noreferrer"target="_blank">Terms and Conditions</a> &nbsp; | &nbsp; <a href="https://mypaymail.co/privacy_policy" rel="noopener noreferrer" target="_blank">Privacy policy</a>
          </p>
        </div>
      </Container>
    </div>
  )
}

export default Footer;
