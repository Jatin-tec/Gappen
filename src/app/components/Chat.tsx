import React from 'react';

const Chat: React.FC = () => {
  return (
    <div className="w-2/5 p-4">
      {/* Your chat component goes here */}
      <div className="border border-gray-300 p-4 h-full">
        {/* Chat code */}
                <div className="flex flex-col h-screen max-w-sm">
                  <div className="flex-grow overflow-y-auto">
                      <div className="flex flex-col mb-4 gap-4 py-4">
                          <div className="flex justify-start">
                              <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[80%]">
                                  <p className="text-gray-900 text-sm">Hey, how are you?</p>
                              </div>
                          </div>
                          <div className="flex justify-end">
                              <div className="bg-blue-500 rounded-lg px-4 py-2 max-w-[80%]">
                                  <p className="text-white text-sm">I'm good, thanks! How about you?</p>
                              </div>
                          </div>
                          <div className="flex justify-start">
                              <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-[80%]">
                                  <p className="text-gray-900 text-sm">I'm doing great, thanks for asking!</p>
                              </div>
                          </div>
                      </div>
                  </div>
                      <div className="flex justify-center items-center h-16">
                        {/* Chat input */}
                        <input type="text" className="border border-gray-300 rounded-lg py-2 px-4 w-full max-w-lg mr-4" placeholder="Type a message..." />
                        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Send</button>
                      </div>
                    </div>
      </div>
    </div>
  );
};

export default Chat;
