import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, FormControl, ListGroup } from 'react-bootstrap';
import './style.css';
import PublicTest from './Components/PublicTestItem';
import { useQueries, useQueryClient, useQuery } from 'react-query';
import { fetchPublicTests, fetchPublicTestById } from './Components/api';

const Tests = () => {
  const queryClient = useQueryClient();
  const { data: publicTests, isLoading, error } = useQuery(['public-tests'], fetchPublicTests);
  const [currentPage, setCurrentPage] = useState(1);
  const [testsPerPage] = useState(12);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const testQueries = useQueries(
    publicTests?.map(test => ({
      queryKey: ['test', test.id],
      queryFn: () => fetchPublicTestById(test.id),
      enabled: !!publicTests
    })) || []
  );

  if (isLoading) return <p>Загрузка...</p>;
  if (error) return <p>Ошибка: {error.message}</p>;

  const isLoadingTests = testQueries.some(query => query.isLoading);
  
  // Получаем все данные, включая возможные undefined/null
  const testData = testQueries.map(query => query.data);

  // Безопасная фильтрация тестов для поиска
  const filteredTests = testData.filter(test => {
    // Проверяем, существует ли объект теста
    if (!test) return false;
    
    const name = test.test?.name || '';
    const description = test.description || '';
    const query = searchQuery.toLowerCase();
    
    return name.toLowerCase().includes(query) || 
           description.toLowerCase().includes(query);
  });

  const getSuggestions = (value) => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    if (inputLength === 0) return [];

    return testData.filter(test => {
      if (!test) return false;
      
      const name = test.test?.name || '';
      const description = test.description || '';
      
      return name.toLowerCase().includes(inputValue) || 
             description.toLowerCase().includes(inputValue);
    });
  };

  const onSuggestionsFetchRequested = ({ value }) => {
    setSuggestions(getSuggestions(value));
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSuggestionsFetchRequested({ value });
  };

  const handleSuggestionClick = (suggestion) => {
    if (!suggestion) return;
    
    const name = suggestion.test?.name || '';
    setSearchQuery(name);
    setSuggestions([]);
  };

  const indexOfLastTest = currentPage * testsPerPage;
  const indexOfFirstTest = indexOfLastTest - testsPerPage;
  const currentTests = filteredTests.slice(indexOfFirstTest, indexOfLastTest);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div>
      <div className='color'>
        <Container className="h-100">
          <Row className="h-100 align-items-center">
            <Col>
              <h1 className="h-white ml-100">Каталог тестов</h1>
            </Col>
            <Col>
              <Form inline>
                <FormControl
                  type='text'
                  placeholder='Введите название или тип теста...'
                  className='mr-sm-2'
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
                {suggestions.length > 0 && (
                  <ListGroup className="suggestions-list">
                    {suggestions.map(suggestion => (
                      suggestion && (
                        <ListGroup.Item 
                          key={suggestion.id} 
                          action 
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion?.test?.name || 'Без названия'}
                        </ListGroup.Item>
                      )
                    ))}
                  </ListGroup>
                )}
              </Form>
            </Col>
          </Row>
        </Container>
      </div>
      <Container>
        <Row>
          {isLoadingTests ? (
            <p>Загрузка тестов...</p>
          ) : currentTests.length > 0 ? (
            currentTests.map((test) => {
              // Проверяем, существует ли тест и имеет ли необходимые свойства
              if (!test || !test.test || !test.test.name) {
                return null; // Пропускаем некорректные тесты
              }
              
              return (
                <Col key={test.id} sm={12} md={6} lg={4}>
                  <PublicTest
                    name={test.test.name} 
                    description={test.description || ''} 
                    id={test.id} 
                    link={`/public-tests/test/${test.test.id}/`} 
                  />
                </Col>
              );
            }).filter(Boolean) // Удаляем null элементы
          ) : (
            <div className='text-center'>
              <h1 className='text-center'>Тестов нет</h1>
              <p>Новые тесты скоро появятся. Если тестов нет - сообщите администратору</p>
            </div>
          )}
        </Row>
        <Row className="mt-4">
          <Col className="d-flex justify-content-center">
            <Pagination
              testsPerPage={testsPerPage}
              totalTests={filteredTests.length}
              paginate={paginate}
              currentPage={currentPage}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Tests;

const Pagination = ({ testsPerPage, totalTests, paginate, currentPage }) => {
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalTests / testsPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <nav>
      <ul className="pagination">
        {pageNumbers.map(number => (
          <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
            <Button onClick={() => paginate(number)} className="page-link">
              {number}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
