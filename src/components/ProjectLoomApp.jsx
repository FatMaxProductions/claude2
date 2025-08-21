import React, { useState, useEffect, useRef } from 'react';
import { Plus, Users, MessageCircle, Settings, Play, Pause, Send, Upload, Trash2, Eye, EyeOff, Download, Loader2, Key, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';

// Main App Component with Database Integration
const ProjectLoomApp = () => {
  const { user, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [personas, setPersonas] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    claude: ''
  });
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [personasData, environmentsData, simulationsData, apiKeysData] = await Promise.all([
        db.getPersonas(),
        db.getEnvironments(),
        db.getSimulations(),
        db.getApiKeys()
      ]);

      setPersonas(personasData);
      setEnvironments(environmentsData);
      setSimulations(simulationsData);

      // Load API keys (show masked for security)
      const keys = { openai: '', claude: '' };
      apiKeysData.forEach(keyData => {
        if (keyData.provider === 'openai' || keyData.provider === 'claude') {
          keys[keyData.provider] = '••••••••';
        }
      });
      setApiKeys(keys);

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load your data. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  // API Integration Functions (same as before)
  const callOpenAI = async (messages, persona) => {
    const apiKeysData = await db.getApiKeys();
    const openaiKey = apiKeysData.find(k => k.provider === 'openai');
    
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = buildSystemPrompt(persona);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey.encrypted_key}`,
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
        max_tokens: persona.word_limit || 200,
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
    const apiKeysData = await db.getApiKeys();
    const claudeKey = apiKeysData.find(k => k.provider === 'claude');
    
    if (!claudeKey) {
      throw new Error('Claude API key not configured');
    }

    const systemPrompt = buildSystemPrompt(persona);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': claudeKey.encrypted_key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: persona.word_limit || 200,
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

    if (persona.knowledge_hub) {
      prompt += `Background and Knowledge:\n${persona.knowledge_hub}\n\n`;
    }

    prompt += `IMPORTANT: Stay in character as ${persona.name}. Respond based on your traits, role, and background. Keep responses conversational and authentic to your personality.`;

    return prompt;
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

  // Navigation Component with user info
  const Navigation = () => (
    <nav className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">🔍 Project Loom</h1>
          <span className="text-purple-200 text-sm">AI Simulation Platform</span>
        </div>
        <div className="flex items-center space-x-4">
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
          
          <div className="flex items-center space-x-3 border-l border-purple-400 pl-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span className="text-sm">{user?.email}</span>
            </div>
            <button
              onClick={signOut}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm flex items-center"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  // API Settings Component with database integration
  const ApiSettings = () => {
    const [localApiKeys, setLocalApiKeys] = useState({ openai: '', claude: '' });
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveApiKeys = async () => {
      setIsSaving(true);
      try {
        if (localApiKeys.openai && localApiKeys.openai !== '••••••••') {
          await db.saveApiKey('openai', localApiKeys.openai);
        }
        
        if (localApiKeys.claude && localApiKeys.claude !== '••••••••') {
          await db.saveApiKey('claude', localApiKeys.claude);
        }

        alert('API keys saved securely! Your personas will now use real AI.');
        setShowApiSettings(false);
        
        setApiKeys({
          openai: localApiKeys.openai ? '••••••••' : '',
          claude: localApiKeys.claude ? '••••••••' : ''
        });
        
      } catch (error) {
        console.error('Error saving API keys:', error);
        alert('Failed to save API keys. Please try again.');
      } finally {
        setIsSaving(false);
      }
    };

    return (
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
                Your keys are encrypted and stored securely.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={localApiKeys.openai}
                onChange={(e) => setLocalApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                placeholder={apiKeys.openai || "sk-..."}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claude API Key
              </label>
              <input
                type="password"
                value={localApiKeys.claude}
                onChange={(e) => setLocalApiKeys(prev => ({ ...prev, claude: e.target.value }))}
                placeholder={apiKeys.claude || "sk-ant-..."}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleSaveApiKeys}
                disabled={isSaving}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save API Keys'
                )}
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
  };

  // Dashboard Component with real data
  const Dashboard = () => (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome back, {user?.user_metadata?.full_name || user?.email}!</h2>
        <p className="text-gray-600">Create AI personas and simulate dynamic interactions in customizable environments.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadInitialData}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

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
          <p className="text-gray-600 mb-4">{simulations.length} simulations saved</p>
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
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="ml-3 text-gray-600">Loading personas...</span>
          </div>
        ) : personas.length === 0 ? (
          <p className="text-gray-500">No personas created yet. Create your first persona to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personas.map((persona) => (
              <div key={persona.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-lg">{persona.name}</h4>
                <p className="text-sm text-gray-600 mb-2">{persona.llm}</p>
                <p className="text-sm text-gray-700">{persona.role}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {persona.traits?.slice(0, 3).map((trait, i) => (
                    <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                      {trait.name}
                    </span>
                  ))}
                  {persona.traits?.length > 3 && (
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

  // Create Persona Component with database integration
  const CreatePersona = () => {
    const [formData, setFormData] = useState({
      name: '',
      llm: '',
      role: '',
      knowledge_hub: '',
      traits: []
    });
    const [selectedTraits, setSelectedTraits] = useState({});
    const [isGeneratingBackstory, setIsGeneratingBackstory] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

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
      setTimeout(() => {
        const backstories = [
          `${formData.name} grew up in a family of engineers, developing a keen analytical mind and attention to detail. Their ${formData.role.toLowerCase()} stems from years of observing complex systems and finding elegant solutions to intricate problems.`,
          `With a background in creative arts and business strategy, ${formData.name} brings a unique perspective to their role as ${formData.role.toLowerCase()}. They believe in challenging conventional wisdom and pushing boundaries.`,
          `${formData.name} started their career in a completely different field before discovering their passion for ${formData.role.toLowerCase()}. This diverse background gives them an unconventional approach to problem-solving.`
        ];
        setFormData(prev => ({
          ...prev,
          knowledge_hub: backstories[Math.floor(Math.random() * backstories.length)]
        }));
        setIsGeneratingBackstory(false);
      }, 2000);
    };

    const handleFileUpload = (event) => {
      const files = Array.from(event.target.files);
      setUploadedFiles(prev => [...prev, ...files]);
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.name || !formData.llm || !formData.role) {
        alert('Please fill in all required fields');
        return;
      }

      setIsSaving(true);
      try {
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
        setFormData({ name: '', llm: '', role: '', knowledge_hub: '', traits: [] });
        setSelectedTraits({});
        setUploadedFiles([]);
        
        alert('Persona created successfully!');
        setCurrentPage('dashboard');
        
      } catch (error) {
        console.error('Error creating persona:', error);
        alert('Failed to create persona. Please try again.');
      } finally {
        setIsSaving(false);
      }
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
            </div>

            {/* Traits Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Traits Section</h3>
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
              <textarea
                value={formData.knowledge_hub}
                onChange={(e) => setFormData(prev => ({ ...prev, knowledge_hub: e.target.value }))}
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
                {formData.knowledge_hub.length}/2500 characters
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors font-semibold flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Persona...
                  </>
                ) : (
                  'Create Persona'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Create Environment Component with database integration
  const CreateEnvironment = () => {
    const [formData, setFormData] = useState({
      name: '',
      description: '',
      participants: [],
      interaction_mode: '',
      word_limit: 200,
      starting_prompt: '',
      human_moderator: false
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleParticipantToggle = (persona) => {
      setFormData(prev => ({
        ...prev,
        participants: prev.participants.some(p => p.id === persona.id)
          ? prev.participants.filter(p => p.id !== persona.id)
          : [...prev.participants, persona]
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.name || !formData.interaction_mode || formData.participants.length === 0) {
        alert('Please fill in required fields and select at least one participant');
        return;
      }

      setIsSaving(true);
      try {
        const newEnvironment = {
          name: formData.name,
          description: formData.description,
          interaction_mode: formData.interaction_mode,
          word_limit: formData.word_limit,
          starting_prompt: formData.starting_prompt,
          human_moderator: formData.human_moderator,
          participants: formData.participants
        };

        const savedEnvironment = await db.createEnvironment(newEnvironment);
        savedEnvironment.participants = formData.participants;
        setEnvironments(prev => [savedEnvironment, ...prev]);
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          participants: [],
          interaction_mode: '',
          word_limit: 200,
          starting_prompt: '',
          human_moderator: false
        });
        
        alert('Environment created successfully!');
        setCurrentPage('dashboard');
        
      } catch (error) {
        console.error('Error creating environment:', error);
        alert('Failed to create environment. Please try again.');
      } finally {
        setIsSaving(false);
      }
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
                    name="interaction_mode"
                    value="auto-loop"
                    checked={formData.interaction_mode === 'auto-loop'}
                    onChange={(e) => setFormData(prev => ({ ...prev, interaction_mode: e.target.value }))}
                    className="mr-3 mt-1"
                    required
                  />
                  <div>
                    <span className="font-medium">Auto-loop</span>
                    <p className="text-sm text-gray-600">Personas talk to each other in a round-robin cycle</p>
                  </div>
                </label>
                <label className="flex items-start">
                  <input
                    type="radio"
                    name="interaction_mode"
                    value="manual"
                    checked={formData.interaction_mode === 'manual'}
                    onChange={(e) => setFormData(prev => ({ ...prev, interaction_mode: e.target.value }))}
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium">Manual</span>
                    <p className="text-sm text-gray-600">User controls who speaks next</p>
                  </div>
                </label>
                <label className="flex items-start">
                  <input
                    type="radio"
                    name="interaction_mode"
                    value="mixed"
                    checked={formData.interaction_mode === 'mixed'}
                    onChange={(e) => setFormData(prev => ({ ...prev, interaction_mode: e.target.value }))}
                    className="mr-3 mt-1"
                  />
                  <div>
                    <span className="font-medium">Mixed</span>
                    <p className="text-sm text-gray-600">User and AI personas both participate</p>
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
                  value={formData.word_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, word_limit: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>50 words</span>
                  <span className="font-medium">{formData.word_limit} words</span>
                  <span>500 words</span>
                </div>
              </div>
            </div>

            {/* Starting Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Seed Prompt (optional)</label>
              <textarea
                value={formData.starting_prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, starting_prompt: e.target.value }))}
                placeholder="Set the opening line, scenario, or context for the conversation..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              />
            </div>

            {/* Human Moderator */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.human_moderator}
                  onChange={(e) => setFormData(prev => ({ ...prev, human_moderator: e.target.checked }))}
                  className="mr-3"
                />
                <span className="font-medium">Enable Human Moderator</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Environment...
                  </>
                ) : (
                  'Create Environment'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Main render with proper loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>
        {showApiSettings && <ApiSettings />}
        {!showApiSettings && currentPage === 'dashboard' && <Dashboard />}
        {!showApiSettings && currentPage === 'create-persona' && <CreatePersona />}
        {!showApiSettings && currentPage === 'create-environment' && <CreateEnvironment />}
      </main>
    </div>
  );
};

export default ProjectLoomApp;
                
