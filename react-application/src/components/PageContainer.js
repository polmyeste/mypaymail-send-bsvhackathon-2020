import React from 'react';

import {
  Container, Row, Col
} from 'reactstrap';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PageContainer = (props) => {
  const { Component } = props;

  return (
    <div id="page-container">
      <div id="content-wrapper" className="bg-light">
        <Navbar />
        <Container className="justify-content-center">
          <Row>
            <Col className="col-md-10 col-xl-6 col-12 mx-auto bg-white shadow">
              <div>
                <div className="mt-2 p-3">
                  <Component />
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
      <Footer />
    </div>
  )
}

export default PageContainer;
