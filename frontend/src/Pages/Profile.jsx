import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Route, Routes, Link, useNavigate } from 'react-router-dom';
import {ChakraProvider, Box, Button, Flex, Heading, Wrap, WrapItem} from "@chakra-ui/react";
import Home from './Components/Home';
import Login from './Components/Login';
import Register from './Components/Register';
import Confirmation from './Components/Confirmation';
import axiosConfig from './Components/AxiosConfig';
import EmailConfirmation from "./Components/EmailConfirmation";
import ChangeData from "./Components/ChangeData";
import RestorePassword from "./Components/RestorePassword"
import PasswordConfirmation from "./Components/PasswordConfirmation"

axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;

function Profile() {
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();


  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    axiosConfig.get('/api/user/check-user-permissions').then(response => {
      const data = response.data;
      const userIsAdmin = data.groups.some(group => group.name === 'Administrators');
      setIsAdmin(userIsAdmin);
    }).catch(error => {
      console.error('Ошибка при получении данных:', error);
    });
  }, []);

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    } else {
      axiosConfig.get("/api/user/current-user/")
        .then(res => {
          console.log('User is authenticated');
          setCurrentUser(true);
          localStorage.setItem('currentUser', JSON.stringify(true));
        })
        .catch(error => {
          console.error("Error fetching user:", error);
          setCurrentUser(false);
          localStorage.setItem('currentUser', JSON.stringify(false));
        });
    }
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await axiosConfig.post("/api/user/logout/")
        .then(() => {
          console.log('User logged out');
          setCurrentUser(false);
          localStorage.removeItem('currentUser');
          navigate('/profile');
        });
    } catch (error) {
      console.error("Error to user logout: ", error.response ? error.response.data : error.message);
      setCurrentUser(false);
      localStorage.removeItem('currentUser');
      document.cookie = 'sessionid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      navigate('/profile');
    }
  };

  return (
    <ChakraProvider>
      <Box>
        <Flex as="nav" bg="blue.500" p="4" color="white" justifyContent="space-between" alignItems="center">
          {currentUser ? (
            <Heading as="h1" size="lg">Профиль</Heading>
          ) : (
            <Heading as="h1" size="lg">Вход или регистрация</Heading>
          )}
          <Flex>
            {currentUser ? (
                <Wrap spacing={2}>
                  <WrapItem>
                    {isAdmin ? (
                      <Button colorScheme='purple' onClick={() => window.location.href = '/administrator/'}>Панель администратора</Button>
                  ) : <></>}
                  </WrapItem>
                  <WrapItem>
                    <form onSubmit={handleLogout}>
                      <Button type="submit" colorScheme="teal">Выход</Button>
                    </form>
                  </WrapItem>
                </Wrap>
            ) : (
              <>
                <Link to="/profile/login">
                  <Button colorScheme="teal" mr="4">Вход</Button>
                </Link>
                <Link to="/profile/register">
                  <Button colorScheme="teal">Регистрация</Button>
                </Link>
              </>
            )}
          </Flex>
        </Flex>
        <Routes>
          <Route path="/" element={<Home currentUser={currentUser} client={axiosConfig} />} />
          <Route path="/confirm-email/:emailConfirmKey" element={<EmailConfirmation client={axiosConfig}/>} />
          <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/confirmation" element={<Confirmation/>} />
          <Route path="/change-data" element={<ChangeData currentUser={currentUser} client={axiosConfig}/>} />
          <Route path="/restore-password" element={<RestorePassword/>} />
          <Route path="/confirm-password/:passwordConfirmKey" element={<PasswordConfirmation/>} />
        </Routes>
      </Box>
    </ChakraProvider>
  );
}

export default Profile;