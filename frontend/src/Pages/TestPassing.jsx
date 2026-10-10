import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './style.css';
import { Container, Button } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { fetchTestById } from './Components/api';
import axiosConfig from './Components/AxiosConfig';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const getCorrectAnswer = (exercise) => {
  const kingJson = exercise.king_json || {};
  if (exercise.type === 1) {
    return (kingJson.missing_words || []).map(wordObj => wordObj.word);
  }
  if (exercise.type === 3) {
    const content = kingJson.content || '';
    const letterByIndex = {};
    (kingJson.missing_words || []).forEach(item => {
      letterByIndex[item.index] = item.word;
    });
    const groups = [];
    for (const match of content.matchAll(/_+/g)) {
      let group = '';
      for (let i = 0; i < match[0].length; i += 1) {
        const letter = letterByIndex[match.index + i];
        group += letter !== undefined ? letter : '_';
      }
      groups.push(group);
    }
    return groups;
  }
  if (exercise.type === 4) {
    return kingJson.correct_order;
  }
  return kingJson.correct_answer;
};

const TestPassing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: test, isLoading, error } = useQuery(['test', id], () => fetchTestById(id));
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [shuffledImages, setShuffledImages] = useState([]);
  const [imageIds, setImageIds] = useState([]);

  const exercises = test?.exercises || [];

  useEffect(() => {
    if (test) {
      console.log('Test loaded:', test);
      setAnswers(test.exercises.map(ex => ({
        id: ex.id,
        type: ex.type,
        answer: ex.type === 1 || ex.type === 3 ? [] : ex.type === 4 ? {} : null
      })));
      setStartDate(new Date().toISOString());
    }
  }, [test]);

  useEffect(() => {
    if (selectedExercise && selectedExercise.type === 4) {
      const images = selectedExercise.king_json.images;
      if (Array.isArray(images)) {
        const shuffled = shuffle(images);
        console.log('Shuffled images:', shuffled);
        setShuffledImages(shuffled);
        const ids = shuffled.map((_, index) => `img${index + 1}`);
        setImageIds(ids);
        console.log('Generated image IDs:', ids);
      } else {
        console.error('selectedExercise.king_json.images is not an array');
      }
    }
  }, [selectedExercise]);

  const shuffle = (array) => {
    if (!Array.isArray(array)) {
      console.error('shuffle: array is not defined or not an array');
      return array;
    }

    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  };

  const selectExercise = (exercise) => {
    console.log('Selected exercise:', exercise);
    setSelectedExercise(exercise);
  };

  const handleInputChange = (event, key) => {
    if (selectedExercise) {
      const updatedAnswers = [...answers];
      const answerObj = updatedAnswers.find(a => a.id === selectedExercise.id);
      if (answerObj) {
        answerObj.answer[key] = event.target.value; 
        setAnswers(updatedAnswers);
        console.log('Updated answers:', updatedAnswers);
      }
    }
  };

  const handleOptionSelect = (option) => {
    if (selectedExercise) {
      const updatedAnswers = [...answers];
      const answerObj = updatedAnswers.find(a => a.id === selectedExercise.id);
      if (answerObj) {
        answerObj.answer = option;
        setAnswers(updatedAnswers);
        console.log('Selected option:', option);
        console.log('Updated answers:', updatedAnswers);
      }
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const updatedImages = [...shuffledImages];
    const [reorderedImage] = updatedImages.splice(result.source.index, 1);
    updatedImages.splice(result.destination.index, 0, reorderedImage);

    setShuffledImages(updatedImages);

    const updatedAnswers = [...answers];
    const answerObj = updatedAnswers.find(a => a.id === selectedExercise.id);
    if (answerObj) {
      answerObj.answer = updatedImages.reduce((acc, image, index) => {
        acc[imageIds[index]] = index + 1;
        return acc;
      }, {});
      setAnswers(updatedAnswers);
    }
  };

  const submitAnswers = async () => {
    setEndDate(new Date().toISOString());
  
    const jsonResult = answers.map(answer => {
      const exercise = exercises.find(ex => ex.id === answer.id);
      return {
        exercise_id: answer.id,
        user_answer: answer.answer,
        correct_answer: getCorrectAnswer(exercise)
      };
    });

    console.log('Submitting answers:', jsonResult);
  
    const responseTest = {
      test: id,
      user: null,
      json_result: JSON.stringify(jsonResult),
      start_date: startDate,
      end_date: endDate
    };
  
    try {
      await axiosConfig.post('/api/v0/response-tests/', responseTest);
      console.log('Answers submitted successfully');
      navigate(`/public-tests/test/result/${id}`, { state: { results: jsonResult } });
    } catch (error) {
      console.error('Error submitting answers:', error);
    }
  };

  if (isLoading) return <h1>Загрузка</h1>;
  if (error) return <h1>Ошибка {error.message}</h1>;
  if (!test) return <h1>Тест не найден</h1>;
  if (!exercises || exercises.length === 0) return <h1>Упражнения не найдены</h1>;

  return (
      <div>
  <div className='tale'>
    <Container>
      <div className='text-center'>
        <h1>{test.name}</h1>
        <div className="d-flex justify-content-center">
          {exercises.map((exercise, index) => (
            <Button
              size="lg"
              className='btn-blue'
              variant="primary"
              key={exercise.id}
              onClick={() => selectExercise(exercise)}
            >
              {index + 1}
            </Button>
          ))}
        </div>
      </div>
    </Container>
  </div>
  <div>
    <Container className='d-flex justify-content-center align-items-center flex-column container-exercise tale'>
      {selectedExercise ? (
        <div className='text-center'>
          <h1>{selectedExercise.name}</h1>
          {selectedExercise.type === 1 ? (
            <div>
              <h2>
                {selectedExercise.king_json?.content.split(/_+/).map((part, idx) => (
                  <span key={idx}>
                    {part}
                    {idx < (selectedExercise.king_json?.content.match(/_+/g)?.length || 0) && (
                      <input
                        type="text"
                        className="input-answer"
                        value={answers.find(a => a.id === selectedExercise.id)?.answer[idx] || ''}
                        onChange={(e) => handleInputChange(e, idx)}
                      />
                    )}
                  </span>
                ))}
              </h2>
            </div>
          ) : selectedExercise.type === 2 ? (
            <div>
              {selectedExercise.king_json?.content ? (
                <div>
                  <img
                    src={selectedExercise.king_json.content}
                    alt="Изображение упражнения"
                    className="half-size"
                  />
                  <div className='d-flex justify-content-center mt-3'>
                    {selectedExercise.king_json.answers.map((answ, index) => (
                      <Button
                        key={index}
                        onClick={() => handleOptionSelect(answ)}
                        className={`mx-2 ${answers.find(a => a.id === selectedExercise.id)?.answer === answ ? 'selected' : ''}`}
                      >
                        {answ}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : selectedExercise.type === 4 ? (
            <div>
              <h2>Расположите изображения в правильном порядке</h2>
              {selectedExercise && shuffledImages.length > 0 && (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="images">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="image-container"
                      >
                        {shuffledImages.map((image, index) => (
                          <Draggable key={imageIds[index]} draggableId={imageIds[index]} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="image-item"
                              >
                                <img
                                  src={image}
                                  alt={`Image ${index}`}
                                  className="image-item"
                                />
                                <input
                                  type="number"
                                  className="input-answer"
                                  value={answers.find(a => a.id === selectedExercise.id)?.answer[imageIds[index]] || ''}
                                  onChange={(e) => handleInputChange(e, imageIds[index])}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          ) : selectedExercise.type === 3 ? (
            <div>
              <h2>
                {selectedExercise.king_json?.content.split(/_+/).map((part, idx) => (
                  <span key={idx}>
                    {part}
                    {idx < (selectedExercise.king_json?.content.match(/_+/g)?.length || 0) && (
                      <input
                        type="text"
                        className="input-answer"
                        value={answers.find(a => a.id === selectedExercise.id)?.answer[idx] || ''}
                        onChange={(e) => handleInputChange(e, idx)}
                      />
                    )}
                  </span>
                ))}
              </h2>
            </div>
          ) : null}
          {selectedExercise.id === exercises[exercises.length - 1].id && (
            <Button onClick={submitAnswers} className='mt-4'>
              Отправить ответы
            </Button>
          )}
        </div>
      ) : null}
    </Container>
  </div>
</div>
  );
}

export default TestPassing;