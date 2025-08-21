import React, { useState, useEffect, useRef } from 'react';
import { Plus, Users, MessageCircle, Settings, Play, Pause, Send, Upload, Trash2, Eye, EyeOff, Download, Loader2, Key } from 'lucide-react';

// Main App Component
const ProjectLoomApp = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [personas, setPersonas] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    claude: ''
  });
  const [showApiSettings, setShowApiSettings] = useState(false);

  // API Integration Functions
  const callOpenAI = async (messages, persona) => {
    if (!apiKeys.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = buildSystemPrompt(persona);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeys.openai}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        ],
        max_tokens: persona.wordLimit || 200,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };

  const callClaude = async (messages, persona) => {
    if (!apiKeys.claude) {
      throw new Error('Claude API key not configured');
    }

    const systemPrompt = buildSystemPrompt(persona);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKeys.claude,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: persona.wordLimit || 200,
        system: systemPrompt,
        messages: messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude API Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.content[0].text;
  };

  const buildSystemPrompt = (persona) => {
    let prompt = `You are ${persona.name}, ${persona.role}\n\n`;
    
    if (persona.traits && persona.traits.length > 0) {
      prompt += "Your personality traits:\n";
      persona.traits.forEach(trait => {
        const intensityDesc = {
          'Weak': 'slightly',
          'Neutral': 'moderately',
          'Strong': 'very'
        };
        prompt += `- ${intensityDesc[trait.intensity] || 'moderately'} ${trait.name.toLowerCase()}\n`;
      });
      prompt += "\n";
    }

    if (persona.knowledgeHub) {
      prompt += `Background and Knowledge:\n${persona.knowledgeHub}\n\n`;
    }

    prompt += `IMPORTANT: Stay in character as ${persona.name}. Respond based on your traits, role, and background. Keep responses conversational and authentic to your personality.`;

    return prompt;
  };

  const callRealAI = async (persona, conversationHistory) => {
    try {
      let response;
      
      if (persona.llm === 'ChatGPT (OpenAI)') {
        response = await callOpenAI(conversationHistory, persona);
      } else if (persona.llm === 'Claude (Anthropic)') {
        response = await callClaude(conversationHistory, persona);
      } else {
        return getSimulatedResponse(persona);
      }

      return response;
    } catch (error) {
      console.error(`AI API Error for ${persona.name}:`, error);
      return `[${persona.name}]: ${error.message}. Falling back to simulated response: ${getSimulatedResponse(persona)}`;
    }
  };

  const getSimulatedResponse = (persona) => {
    const responses = [
      `As ${persona.name}, given my role as ${persona.role}, I think we should approach this systematically. My experience tells me that this situation requires careful consideration of all stakeholders involved.`,
      
      `Speaking from my perspective as ${persona.role}, I'd like to challenge some assumptions here. We're looking at this from a narrow perspective, and I believe we need to expand our thinking beyond conventional solutions.`,
      
      `I appreciate the different viewpoints being shared. From my analytical perspective, I see several patterns emerging that we should address. Let me break down what I'm observing and propose a path forward.`,
      
      `This reminds me of a similar situation I encountered before. The key insight I gained was that sustainable solutions often require us to balance competing priorities rather than choosing sides.`,
      
      `I'm curious about the underlying motivations here. If we dig deeper into the 'why' behind these surface-level issues, I think we'll find more creative and effective approaches to resolution.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // API Settings Component
  const ApiSettings = () => (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center mb-6">
          <Key className="w-8 h-8 text-blue-600 mr-3" />
          <h2 className="text-3xl font-bold text-gray-800">API Settings</h2>
        </div>
        
        <div className="space-y-6">
          <div className="p-4 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">🔑 Required for Real AI</h4>
            <p className="text-sm text-yellow-800">
              Add your API keys to enable real AI conversations. Without these, personas will use simulated responses.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKeys.openai}
              onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
              placeholder="sk-..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get your key from: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com/api-keys</a>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Claude API Key
            </label>
            <input
              type="password"
              value={apiKeys.claude}
              onChange={(e) => setApiKeys(prev => ({ ...prev, claude: e.target.value }))}
              placeholder="sk-ant-..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get your key from: <a href="https://console.anthropic.com/account/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.anthropic.com/account/keys</a>
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💰 Cost Information</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>OpenAI GPT-4:</strong> ~$0.01-0.05 per conversation turn</p>
              <p><strong>Claude:</strong> ~$0.01-0.03 per conversation turn</p>
              <p><strong>Tip:</strong> Start with $5-10 in API credits for testing</p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => {
                alert('API keys saved! Your personas will now use real AI.');
                setShowApiSettings(false);
              }}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Save API Keys
            </button>
            <button
              onClick={() => setShowApiSettings(false)}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Navigation Component
 const Navigation = () => (
    <nav className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">🔍 Project Loom</h1>
          <span className="text-purple-200 text-sm">AI Simulation Platform</span>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`px-4 py-2 rounded-lg transition-colors ${currentPage === 'dashboard' ? 'bg-white text-purple-600' : 'hover:bg-purple-700'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentPage('create-persona')}
            className={`px-4 py-2 rounded-lg transition-colors ${currentPage === 'create-persona' ? 'bg-white text-purple-600' : 'hover:bg-purple-700'}`}
          >
            Create Persona
          </button>
          <button
            onClick={() => setCurrentPage('create-environment')}
            className={`px-4 py-2 rounded-lg transition-colors ${currentPage === 'create-environment' ? 'bg-white text-purple-600' : 'hover:bg-purple-700'}`}
          >
            Create Environment
          </button>
          <button
            onClick={() => setCurrentPage('simulation')}
            className={`px-4 py-2 rounded-lg transition-colors ${currentPage === 'simulation' ? 'bg-white text-purple-600' : 'hover:bg-purple-700'}`}
          >
            Simulation
          </button>
          <button
            onClick={() => setShowApiSettings(true)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center ${showApiSettings ? 'bg-white text-purple-600' : 'hover:bg-purple-700'}`}
          >
            <Key className="w-4 h-4 mr-2" />
            API Keys
          </button>
        </div>
      </div>
    </nav>
  );

  // Dashboard Component
  const Dashboard = () => (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Project Loom</h2>
        <p className="text-gray-600">Create AI personas and simulate dynamic interactions in customizable environments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center mb-4">
            <Users className="w-8 h-8 text-purple-600 mr-3" />
            <h3 className="text-xl font-semibold">Personas</h3>
          </div>
          <p className="text-gray-600 mb-4">You have {personas.length} personas created</p>
          <button
            onClick={() => setCurrentPage('create-persona')}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Persona
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center mb-4">
            <Settings className="w-8 h-8 text-blue-600 mr-3" />
            <h3 className="text-xl font-semibold">Environments</h3>
          </div>
          <p className="text-gray-600 mb-4">You have {environments.length} environments created</p>
          <button
            onClick={() => setCurrentPage('create-environment')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Environment
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center mb-4">
            <MessageCircle className="w-8 h-8 text-green-600 mr-3" />
            <h3 className="text-xl font-semibold">Simulations</h3>
          </div>
          <p className="text-gray-600 mb-4">Ready to run simulations</p>
          <button
            onClick={() => setCurrentPage('simulation')}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Simulation
          </button>
        </div>
      </div>

      {/* Recent Personas */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold mb-4">Your Personas</h3>
        {personas.length === 0 ? (
          <p className="text-gray-500">No personas created yet. Create your first persona to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((persona, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-lg">{persona.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{persona.llm}</p>
                <p className="text-sm text-gray-700">{persona.role}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {persona.traits.slice(0, 3).map((trait, i) => (
                    <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      {trait.name}
                    </span>
                  ))}
                  {persona.traits.length > 3 && (
                    <span className="text-xs text-gray-500">+{persona.traits.length - 3} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Create Persona Component
  const CreatePersona = () => {
    const [formData, setFormData] = useState({
      name: '',
      llm: '',
      role: '',
      knowledgeHub: '',
      traits: []
    });
    const [selectedTraits, setSelectedTraits] = useState({});
    const [isGeneratingBackstory, setIsGeneratingBackstory] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const traitCategories = {
      'Personality Type': ['Introverted', 'Extroverted', 'Ambivert', 'Optimistic', 'Realistic', 'Cynical'],
      'Cognitive Approach': ['Analytical', 'Creative', 'Strategic', 'Intuitive', 'Detail-oriented', 'Big-picture thinker'],
      'Communication Style': ['Assertive', 'Passive', 'Persuasive', 'Diplomatic', 'Blunt', 'Humorous'],
      'Emotional Tone': ['Calm', 'Passionate', 'Stoic', 'Empathetic', 'Playful', 'Anxious'],
      'Problem-Solving Strategy': ['Logical', 'Experimental', 'Collaborative', 'Cautious', 'Decisive', 'Adaptive'],
      'Motivations / Drives': ['Power', 'Curiosity', 'Recognition', 'Security', 'Achievement', 'Belonging']
    };

    const handleTraitToggle = (category, trait) => {
      const key = `${category}-${trait}`;
      setSelectedTraits(prev => {
        const newTraits = { ...prev };
        if (newTraits[key]) {
          delete newTraits[key];
        } else {
          newTraits[key] = { name: trait, category, intensity: 'Neutral' };
        }
        return newTraits;
      });
    };

    const handleIntensityChange = (traitKey, intensity) => {
      setSelectedTraits(prev => ({
        ...prev,
        [traitKey]: { ...prev[traitKey], intensity }
      }));
    };

    const generateBackstory = async () => {
      setIsGeneratingBackstory(true);
      // Simulate AI backstory generation
      setTimeout(() => {
        const backstories = [
          `${formData.name} grew up in a family of engineers, developing a keen analytical mind and attention to detail. Their ${formData.role.toLowerCase()} stems from years of observing complex systems and finding elegant solutions to intricate problems.`,
          `With a background in creative arts and business strategy, ${formData.name} brings a unique perspective to their role as ${formData.role.toLowerCase()}. They believe in challenging conventional wisdom and pushing boundaries.`,
          `${formData.name} started their career in a completely different field before discovering their passion for ${formData.role.toLowerCase()}. This diverse background gives them an unconventional approach to problem-solving.`
        ];
        setFormData(prev => ({
          ...prev,
          knowledgeHub: backstories[Math.floor(Math.random() * backstories.length)]
        }));
        setIsGeneratingBackstory(false);
      }, 2000);
    };

    const handleFileUpload = (event) => {
      const files = Array.from(event.target.files);
      setUploadedFiles(prev => [...prev, ...files]);
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.name || !formData.llm || !formData.role) {
        alert('Please fill in all required fields');
        return;
      }

      const newPersona = {
  name: formData.name,
  llm: formData.llm,
  role: formData.role,
  knowledge_hub: formData.knowledge_hub,
  traits: Object.values(selectedTraits),
  files: uploadedFiles.map(f => ({ name: f.name, size: f.size }))
};

const savedPersona = await db.createPersona(newPersona);
setPersonas(prev => [savedPersona, ...prev]);
      
      // Reset form
      setFormData({ name: '', llm: '', role: '', knowledgeHub: '', traits: [] });
      setSelectedTraits({});
      setUploadedFiles([]);
      
      alert('Persona created successfully!');
      setCurrentPage('dashboard');
    };

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Create a New Persona</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Type here"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {/* LLM Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose an LLM *</label>
              <div className="space-y-2">
                {['ChatGPT (OpenAI)', 'Gemini (Google)', 'Claude (Anthropic)'].map(llm => (
                  <label key={llm} className="flex items-center">
                    <input
                      type="radio"
                      name="llm"
                      value={llm}
                      checked={formData.llm === llm}
                      onChange={(e) => setFormData(prev => ({ ...prev, llm: e.target.value }))}
                      className="mr-3"
                      required
                    />
                    <span>{llm}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Role/Function */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role / Function *</label>
              <textarea
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="Creative strategist who challenges assumptions"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows="3"
                required
              />
              <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">💡 Tip: How to Write an Effective Role/Function</h4>
                <p className="text-sm text-blue-800 mb-2">
                  Describe the persona's role using a brief but purposeful phrase. Combine a title or identity with a functional goal or behavior.
                </p>
                <p className="text-sm text-blue-800 font-medium mb-1">[Who they are] + [What they're meant to do]</p>
                <div className="text-sm text-blue-700">
                  <p><strong>Examples:</strong></p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>"Product Manager who challenges assumptions and drives innovation"</li>
                    <li>"Skeptical scientist focused on disproving weak arguments"</li>
                    <li>"Charismatic team lead who mediates conflict and inspires alignment"</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Traits Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Traits Section</h3>
              <div className="p-4 bg-yellow-50 rounded-lg mb-4">
                <h4 className="font-medium text-yellow-900 mb-2">💡 Tip: Why Traits Matter</h4>
                <p className="text-sm text-yellow-800">
                  While not required, carefully selecting traits will generate the best results because traits guide how the persona thinks, 
                  communicates, and reacts in different situations. The more accurately you define traits, the more realistic and useful your persona will be.
                </p>
              </div>

              {Object.entries(traitCategories).map(([category, traits]) => (
                <div key={category} className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-3">{category}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {traits.map(trait => {
                      const traitKey = `${category}-${trait}`;
                      const isSelected = selectedTraits[traitKey];
                      
                      return (
                        <div key={trait} className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => handleTraitToggle(category, trait)}
                              className="mr-2"
                            />
                            <span className="text-sm">{trait}</span>
                          </label>
                          
                          {isSelected && (
                            <div className="ml-6">
                              <select
                                value={isSelected.intensity}
                                onChange={(e) => handleIntensityChange(traitKey, e.target.value)}
                                className="text-xs p-1 border border-gray-300 rounded"
                              >
                                <option value="Weak">Weak</option>
                                <option value="Neutral">Neutral</option>
                                <option value="Strong">Strong</option>
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Knowledge Hub */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Knowledge Hub</label>
              <p className="text-sm text-gray-600 mb-4">
                Use this space to enrich your persona with deeper context. You can write a custom backstory, 
                add key facts, paste relevant information, upload documents, or generate a backstory using AI.
              </p>
              
              <textarea
                value={formData.knowledgeHub}
                onChange={(e) => setFormData(prev => ({ ...prev, knowledgeHub: e.target.value }))}
                placeholder="Write a custom backstory or key information..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-4"
                rows="6"
                maxLength="2500"
              />
              
              <div className="flex space-x-4 mb-4">
                <button
                  type="button"
                  onClick={generateBackstory}
                  disabled={isGeneratingBackstory || !formData.name || !formData.role}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isGeneratingBackstory ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Generate Backstory
                </button>
                
                <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Uploaded Files:</h4>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-right text-sm text-gray-500">
                {formData.knowledgeHub.length}/2500 characters
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Create Persona
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Create Environment Component
  const CreateEnvironment = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      participants: [],
      interactionMode: '',
      wordLimit: 200,
      linkedEnvironment: '',
      startingPrompt: '',
      humanModerator: false
    });
    const [showPreview, setShowPreview] = useState(false);

    const handleParticipantToggle = (persona) => {
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.some(p => p.id === persona.id)
          ? prev.participants.filter(p => p.id !== persona.id)
          : [...prev.participants, persona]
      }));
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!formData.name || !formData.interactionMode || formData.participants.length === 0) {
        alert('Please fill in required fields and select at least one participant');
        return;
      }

      const newEnvironment = {
        ...formData,
        id: Date.now(),
        createdAt: new Date().toISOString()
      };

      setEnvironments(prev => [...prev, newEnvironment]);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        participants: [],
        interactionMode: '',
        wordLimit: 200,
        linkedEnvironment: '',
        startingPrompt: '',
        humanModerator: false
      });
      
      alert('Environment created successfully!');
      setCurrentPage('dashboard');
    };

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Create a New Environment</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Environment Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Environment Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder='e.g., "Team Brainstorm" or "Interrogation Room"'
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional context or notes (e.g., simulation goals or background)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              />
            </div>

            {/* Choose Participants */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose Participants *</label>
              {personas.length === 0 ? (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-yellow-800">No personas available. Please create some personas first.</p>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('create-persona')}
                    className="mt-2 text-yellow-600 hover:text-yellow-800 underline"
                  >
                    Create a persona now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {personas.map(persona => (
                    <label key={persona.id} className="flex items-start p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.participants.some(p => p.id === persona.id)}
                        onChange={() => handleParticipantToggle(persona)}
                        className="mr-3 mt-1"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{persona.name}</h4>
                        <p className="text-sm text-gray-600">{persona.role}</p>
                        <p className="text-sm text-gray-500">{persona.llm}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Interaction Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Conversation Flow *</label>
              <div className="space-y-2">
                <label className="flex items-start">
                  <input
                    type="radio"
                    name="interactionMode"
                    value="auto-loop"
                    checked={formData.interactionMode === 'auto-loop'}
                    onChange={(e) => setFormData(prev => ({ ...prev, interactionMode: e.target.value }))}
                    className="mr-3 mt-1"
                    required
                  />
                  <div>
                    <span className="font-medium">🔁 Auto-loop</span>
                    <p className="text-sm text-gray-600">Personas talk to each other in a round-robin or scenario-based cycle</p>
                  </div>
                </label>
                <label className="flex items-start">
                  <input
                    type="radio"
                    name="interactionMode"
                    value="manual"
                    checked={formData.interactionMode === 'manual'}
                    onChange={(e) => setFormData(prev => ({ ...prev, interactionMode: e.target.value }))}
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium">🎮 Manual</span>
                    <p className="text-sm text-gray-600">User controls who speaks next and can insert prompts</p>
                  </div>
                </label>
                <label className="flex items-start">
                  <input
                    type="radio"
                    name="interactionMode"
                    value="mixed"
                    checked={formData.interactionMode === 'mixed'}
                    onChange={(e) => setFormData(prev => ({ ...prev, interactionMode: e.target.value }))}
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium">🧍 Mixed</span>
                    <p className="text-sm text-gray-600">User and AI personas both participate (human moderator)</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Word Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Limit AI Responses</label>
              <div className="space-y-3">
                <input
                  type="range"
                  min="50"
                  max="500"
                  value={formData.wordLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, wordLimit: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>50 words (short sentence)</span>
                  <span className="font-medium">{formData.wordLimit} words</span>
                  <span>500 words (full response)</span>
                </div>
              </div>
            </div>

            {/* Starting Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seed Prompt (optional)</label>
              <textarea
                value={formData.startingPrompt}
                onChange={(e) => setFormData(prev => ({ ...prev, startingPrompt: e.target.value }))}
                placeholder="Set the opening line, scenario, or context for the conversation..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              />
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-medium mb-1">Examples:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>"You've just been hired. The team is skeptical."</li>
                  <li>"There's been a breach in the system. Respond."</li>
                  <li>"You're meeting for the first time to plan a heist."</li>
                </ul>
              </div>
            </div>

            {/* Human Moderator */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.humanModerator}
                  onChange={(e) => setFormData(prev => ({ ...prev, humanModerator: e.target.checked }))}
                  className="mr-3"
                />
                <span className="font-medium">Enable Human Moderator</span>
              </label>
              <p className="text-sm text-gray-600 ml-6">Allows user to interject, control turn order, and add manual notes</p>
            </div>

            {/* Preview Participants */}
            {formData.participants.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mb-4"
                >
                  {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showPreview ? 'Hide Preview' : 'Preview Participants'}
                </button>

                {showPreview && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    <h4 className="font-medium text-gray-800">Selected Participants:</h4>
                    {formData.participants.map(persona => (
                      <div key={persona.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-semibold">{persona.name}</h5>
                          <span className="text-sm text-gray-500">{persona.llm}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2"><strong>Role:</strong> {persona.role}</p>
                        {persona.traits.length > 0 && (
                          <div className="mb-2">
                            <strong className="text-sm">Traits:</strong>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {persona.traits.map((trait, i) => (
                                <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  {trait.name} ({trait.intensity})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {persona.knowledgeHub && (
                          <p className="text-sm text-gray-600">
                            <strong>Knowledge:</strong> {persona.knowledgeHub.substring(0, 300)}
                            {persona.knowledgeHub.length > 300 && '...'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                Create Environment
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Simulation Component
    const Simulation = () => {
    const [selectedEnvironment, setSelectedEnvironment] = useState(null);
    const [userMessage, setUserMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [localChatHistory, setLocalChatHistory] = useState([]);
    const chatRef = useRef(null);
    const [isSimulationRunning, setIsSimulationRunning] = useState(false);
    const simulationRunningRef = useRef(false);

useEffect(() => {
    simulationRunningRef.current = isSimulationRunning;
  }, [isSimulationRunning]);

    useEffect(() => {
      if (chatRef.current) {
        chatRef.current.scrollTop = chatRef.current.scrollHeight;
      }
    }, [localChatHistory]);

    const startSimulation = (environment) => {
      console.log('Starting simulation with environment:', environment);
      setSelectedEnvironment(environment);
      setLocalChatHistory([]);
      
      // Add starting prompt if exists
      if (environment.startingPrompt) {
        setLocalChatHistory([{
          id: Date.now(),
          type: 'system',
          content: environment.startingPrompt,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    };

      const simulateAIResponse = async (persona, context = '') => {
      setIsProcessing(true);
      
      try {
        const conversationContext = localChatHistory.filter(msg => msg.type !== 'system');
        
        let response;
        let isRealAI = false;
        
        if (apiKeys.openai && persona.llm === 'ChatGPT (OpenAI)') {
          response = await callRealAI(persona, conversationContext);
          isRealAI = true;
        } else if (apiKeys.claude && persona.llm === 'Claude (Anthropic)') {
          response = await callRealAI(persona, conversationContext);
          isRealAI = true;
        } else {
          // Fallback to simulated response
          await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
          response = getSimulatedResponse(persona);
        }
        
        const newMessage = {
          id: Date.now(),
          type: 'ai',
          persona: persona.name,
          content: response,
          timestamp: new Date().toLocaleTimeString(),
          llm: persona.llm,
          isRealAI
        };
        
        setLocalChatHistory(prev => [...prev, newMessage]);
        setIsProcessing(false);
        
        return newMessage;
      } catch (error) {
        console.error('AI Response Error:', error);
        const fallbackResponse = getSimulatedResponse(persona);
        const newMessage = {
          id: Date.now(),
          type: 'ai',
          persona: persona.name,
          content: `[Connection Error]: ${fallbackResponse}`,
          timestamp: new Date().toLocaleTimeString(),
          llm: persona.llm,
          isRealAI: false
        };
        
        setLocalChatHistory(prev => [...prev, newMessage]);
        setIsProcessing(false);
        return newMessage;
      }
    };

    const handleAutoLoop = async () => {
  if (!selectedEnvironment || isProcessing) return;
  
  setIsSimulationRunning(true);
  const participants = selectedEnvironment.participants;
  let currentRound = 0;
  const maxRounds = 5; // Make this configurable later
  
  const runNextTurn = async () => {
  if (!simulationRunningRef.current) return;  // ← This line is HERE
  if (currentRound >= maxRounds) {
    setIsSimulationRunning(false);
    return;
  }
  
  for (let i = 0; i < participants.length; i++) {
    if (!simulationRunningRef.current) break;  // ← This line is HERE
    
    const persona = participants[i];
    try {
      await simulateAIResponse(persona, selectedEnvironment.startingPrompt);
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error('Error in auto-loop:', error);
      continue;
    }
    
    if (!simulationRunningRef.current) break;  // ← And this line is HERE
  }
  
  currentRound++;
  if (simulationRunningRef.current && currentRound < maxRounds) {
    setTimeout(runNextTurn, 1000);
  } else {
    setIsSimulationRunning(false);
  }
};
  
  runNextTurn();
};
    const handleManualTurn = async (persona) => {
      if (isProcessing) return;
      await simulateAIResponse(persona);
    };

    const handleUserMessage = () => {
      if (!userMessage.trim()) return;
      
      const newMessage = {
        id: Date.now(),
        type: 'user',
        content: userMessage,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setLocalChatHistory(prev => [...prev, newMessage]);
      setUserMessage('');
    };

    const stopSimulation = () => {
      setIsSimulationRunning(false);
      setIsProcessing(false);
    };

    const exportChat = () => {
      const chatData = {
        environment: selectedEnvironment?.name,
        participants: selectedEnvironment?.participants.map(p => p.name),
        messages: localChatHistory,
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loom-simulation-${selectedEnvironment?.name}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };

    if (!selectedEnvironment) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Select an Environment</h2>
            
            {environments.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Environments Available</h3>
                <p className="text-gray-500 mb-6">Create an environment first to start running simulations.</p>
                <button
                  onClick={() => setCurrentPage('create-environment')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Environment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {environments.map(env => (
                  <div key={env.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    <h3 className="text-xl font-semibold mb-2">{env.name}</h3>
                    {env.description && (
                      <p className="text-gray-600 mb-3">{env.description}</p>
                    )}
                    <div className="mb-4">
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Participants:</strong> {env.participants.length}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {env.participants.map(participant => (
                          <span key={participant.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            {participant.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        <strong>Mode:</strong> {env.interactionMode.replace('-', ' ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Word Limit:</strong> {env.wordLimit} words
                      </p>
                    </div>
                    <button
                      onClick={() => startSimulation(env)}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Simulation
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[80vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedEnvironment.name}</h2>
                <p className="text-gray-600">
                  {selectedEnvironment.participants.length} participants • {selectedEnvironment.interactionMode.replace('-', ' ')} mode
                </p>
              </div>
              <div className="flex space-x-3">
                {selectedEnvironment.interactionMode === 'auto-loop' && (
                  <button
                    onClick={isSimulationRunning ? stopSimulation : handleAutoLoop}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                      isSimulationRunning 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {isSimulationRunning ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Auto-Run
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={exportChat}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
                <button
                  onClick={() => {
                    setSelectedEnvironment(null);
                    setLocalChatHistory([]);
                    setIsSimulationRunning(false);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          </div>

          {/* Participants Bar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex space-x-4 overflow-x-auto">
              {selectedEnvironment.participants.map(participant => (
                <div key={participant.id} className="flex-shrink-0 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {participant.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{participant.name}</p>
                    <p className="text-xs text-gray-500">{participant.llm.split(' ')[0]}</p>
                  </div>
                  {selectedEnvironment.interactionMode === 'manual' && (
                    <button
                      onClick={() => handleManualTurn(participant)}
                      disabled={isProcessing}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      Speak
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {localChatHistory.length === 0 && !isProcessing && (
                <div className="text-center text-gray-500 py-12">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Simulation ready. Start the conversation!</p>
                </div>
              )}
              
              {localChatHistory.map(message => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl rounded-lg p-4 ${
                    message.type === 'system' 
                      ? 'bg-yellow-50 border border-yellow-200 text-yellow-800 text-center w-full'
                      : message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {message.type === 'ai' && (
                      <div className="flex items-center mb-2">
                        <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
                          {message.persona.charAt(0)}
                        </div>
                        <span className="font-semibold text-sm">{message.persona}</span>
                        <span className="text-xs text-gray-500 ml-2">via {message.llm.split(' ')[0]}</span>
                      </div>
                    )}
                    {message.type === 'user' && (
                      <div className="flex items-center mb-2">
                        <span className="font-semibold text-sm">You</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">{message.timestamp}</p>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4 flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-sm text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* User Input (for mixed/manual modes) */}
            {(selectedEnvironment.interactionMode === 'mixed' || selectedEnvironment.humanModerator) && (
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={userMessage}
                    onChange={(e) => setUserMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUserMessage()}
                    placeholder="Type your message..."
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleUserMessage}
                    disabled={!userMessage.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>
        {showApiSettings && <ApiSettings />}
        {!showApiSettings && currentPage === 'dashboard' && <Dashboard />}
        {!showApiSettings && currentPage === 'create-persona' && <CreatePersona />}
        {!showApiSettings && currentPage === 'create-environment' && <CreateEnvironment />}
        {!showApiSettings && currentPage === 'simulation' && <Simulation />}
      </main>
    </div>
  );
};

export default ProjectLoomApp;
