import React, { useState, useEffect } from 'react';
import MessageItem from './MessageItem';
import ChatOptionsMenu from './ChatOptionsMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { useNotificationWS } from '../../contexts/NotifWSContext.jsx';
import { useNavigate } from 'react-router-dom';
    
function ChatWindow({ currentContact, chat, message, sendMessage, handleTyping, data, chatMessagesRef, sockets, typingUser }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [otherUser, setOtherUser] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const { sendMessage: sendNotifMessage, isConnected } = useNotificationWS();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentContact) {
            setOtherUser(currentContact.user1.id === data.user.id ? currentContact.user2 : currentContact.user1);
        } else {
            setOtherUser(null);
        }
    }, [currentContact])

    useEffect(() => {
        if (typingUser && otherUser) {
            if (typingUser.sender === otherUser.id) {
                setIsTyping(true)
            }
        }
    }, [typingUser])

    useEffect(() => {
        if (isTyping) {
            const timer = setTimeout(() => {
                setIsTyping(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isTyping])

    useEffect(() => {
        if (data.user) {
            setCurrentUser(data.user);
        }
    }, [data.user]);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    // const handleBlockUser = (e) => {
    //     if (!otherUser) {
    //         return;
    //     }
    //     if (sockets[currentContact.id] && sockets[currentContact.id].readyState === WebSocket.OPEN) {
    //         sockets[currentContact.id].send(JSON.stringify({
    //             type: 'BLOCK_USER',
    //             event: e ? 'BLOCK' : 'UNBLOCK',
    //             user_id: otherUser.id
    //         }));
    //     }
    // };

    const handlePlayPong = () => {
        console.log('Play Pong');
        if (isConnected) {
            console.log('Connected');
            sendNotifMessage({
                type: 'SEND_GR',
                game_type: 'PONG',
                to_user_id: otherUser.id
            });
            //testing
            const token = localStorage.getItem('token');
            const pong_socket = new WebSocket(`ws://10.13.7.4:8000/ws/play-friend/?token=${token}`);
            pong_socket.onopen = () => {
                const data2 = {
                    action: 'friend_game',
                    player1: data.user.username,
                    player2: otherUser.username,
                    value: `${'game'+data.user.username+'vs'+otherUser.username}`,
                }
                pong_socket.send(JSON.stringify(data2));
                navigate('/friend-game');
            }
        }
        else {
            console.log('Not connected');
        }
        // return () => {
        //     if (pong_socket && pong_socket.readyState === WebSocket.OPEN) {
        //         pong_socket.close();
        // };
    };

    const handlePlayTicTacToe = () => {
        console.log('Play Tic-Tac-Toe');
        if (isConnected) {
            sendNotifMessage({
                type: 'SEND_GR',
                game_type: 'TICTACTOE',
                to_user_id: otherUser.id
            });
        }
    };

    const viewProfile = () => {
        console.log('View Profile');
        // navigate(`/profile/${otherUser.id}`);
    };

    const onFriendRequest = () => {
        console.log('Friend Request:', otherUser.username);
        if (isConnected) {
            sendNotifMessage({
                type: 'SEND_FR',
                to_user_id: otherUser.id
            });
            
        }
    }

    return (
        <div className="chat-container">
            {otherUser ? (
                <>
                    <div className="chat-header">
                        <div className="current-contact">
                            {otherUser.avatar ? (
                                <img src={otherUser.avatar} alt={otherUser.username} className="contact-avatar" />
                            ) : (
                                <div className="contact-avatar default-avatar">
                                    <FontAwesomeIcon icon={faUser} />
                                </div>
                            )}
                            <span className="contact-name">
                                {otherUser.username}
                            </span>
                            {isTyping && (
                                <div className="typing-indicator">
                                    <p>Typing...</p>
                                </div>
                            )}
                        </div>
                        <ChatOptionsMenu
                            // onBlockUser={handleBlockUser}
                            onPlayPong={handlePlayPong}
                            onPlayTicTacToe={handlePlayTicTacToe}
                            otherUser={otherUser}
                            currentUser={currentUser}
                            viewProfile={viewProfile}
                            onFriendRequest={onFriendRequest}
                        />
                    </div>
                    <div className="chat-messages" ref={chatMessagesRef}>
                        {chat.map((msg, index) => (
                            <MessageItem key={index} message={msg} currentUser={currentUser} />
                        ))}
                    </div>
                    <div className="chat-form-container">
                        <form className="chat-form" onSubmit={sendMessage}>
                            <input
                                type="text"
                                className="chat-message"
                                value={message}
                                onChange={handleTyping}
                                placeholder="Type a message"
                                maxLength={1000}
                            />
                            <button type="submit">Send</button>
                        </form>
                    </div>
                </>
            ) : (
                <div className="no-contact-selected">
                    <p>Select a contact to start chatting</p>
                </div>
            )}
        </div>
    );
}

export default ChatWindow;