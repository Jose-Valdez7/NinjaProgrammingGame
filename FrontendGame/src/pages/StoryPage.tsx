import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StorySequence } from '../components/StorySequence';

export default function StoryPage() {
  const navigate = useNavigate();

  const handleStoryComplete = () => {
    navigate('/game');
  };

  return <StorySequence onComplete={handleStoryComplete} />;
}
