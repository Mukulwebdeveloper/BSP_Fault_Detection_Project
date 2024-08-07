"use client"
import React, { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { regionsname, sensorsTagnames } from '@/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface SensorData {
  result: string;
  table: number;
  start: string;
  stop: string;
  time: string;
  value: number;
  field: string;
  measurement: string;
  sensor_name: string;
  alarm?: boolean;
}

const regions = regionsname.map((reg)=>reg.regionName) // Add your regions here
// const sensors = ['predicted_cobble', 'predicted_temperature', 'predicted_pressure', 'predicted_humidity', 'predicted_vibration', 'predicted_flow_rate', 'predicted_level', 'predicted_voltage', 'predicted_current', 'predicted_power'];
const sensors = sensorsTagnames.map((sensor)=>sensor.Tagname)

const SensorDataVisualization: React.FC<{ sensorDataArray: SensorData[] }> = ({ sensorDataArray }) => {
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedSensor, setSelectedSensor] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);

  const filteredData = sensorDataArray.filter(data => 

    (!startTime || new Date(data.time) >= startTime) &&
    (!endTime || new Date(data.time) <= endTime)
  );

  const chartData = {
    labels: filteredData.map(data => new Date(data.time).toLocaleTimeString()),
    datasets: [
      {
        label: selectedSensor,
        data: filteredData.map(data => data.value),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const clickedIndex = elements[0].index;
        const clickedTime = new Date(filteredData[clickedIndex].time);
        const startTime = new Date(filteredData[0].time);
        const videoDuration = 15 * 60; // 15 minutes in seconds
        const elapsedSeconds = (clickedTime.getTime() - startTime.getTime()) / 1000;
        const videoTime = (elapsedSeconds / videoDuration) * videoDuration;
        
        if (videoRef.current) {
          videoRef.current.currentTime = videoTime;
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Value'
        }
      }
    },
    maintainAspectRatio: false
  };

  const handleProceed = () => {
    setShowGraph(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    const updateVideoTime = () => {
      if (videoRef.current) {
        setCurrentVideoTime(videoRef.current.currentTime);
      }
    };

    const intervalId = setInterval(updateVideoTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const currentDataPoint = filteredData.find(data => {
    const dataTime = new Date(data.time);
    const videoStartTime = new Date(filteredData[0].time);
    const elapsedVideoSeconds = currentVideoTime;
    const elapsedDataSeconds = (dataTime.getTime() - videoStartTime.getTime()) / 1000;
    return Math.abs(elapsedDataSeconds - elapsedVideoSeconds) < 1; // Within 1 second
  });

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <select
          className="border p-2 w-full"
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
        >
          <option value="">Select Region</option>
          {regions.map(region => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
        <select
          className="border p-2 w-full"
          value={selectedSensor}
          onChange={(e) => setSelectedSensor(e.target.value)}
        >
          <option value="">Select Sensor</option>
          {sensors.map(sensor => (
            <option key={sensor} value={sensor}>{sensor}</option>
          ))}
        </select>
        <DatePicker
          selected={startTime}
          onChange={(date) => setStartTime(date)}
          showTimeSelect
          dateFormat="MMMM d, yyyy h:mm aa"
          className="border p-2 w-full"
          placeholderText="Start Time"
        />
        <DatePicker
          selected={endTime}
          onChange={(date) => setEndTime(date)}
          showTimeSelect
          dateFormat="MMMM d, yyyy h:mm aa"
          className="border p-2 w-full"
          placeholderText="End Time"
        />
      </div>
      <button
        className="bg-blue-500 text-white p-2 rounded w-full mb-4"
        onClick={handleProceed}
      >
        Proceed
      </button>

      {showGraph && (
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="w-full md:w-1/2">
            <video
              ref={videoRef}
              src="/1.mkv"
              controls
              className="w-full h-auto"
            />
            <div className="flex justify-between items-center mt-2">
              <span>Playback Speed:</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                className="w-1/2"
              />
              <span>{playbackRate}x</span>
            </div>
          </div>
          <div className="w-full md:w-1/2 h-[400px]">
            <Line data={chartData} options={chartOptions} />
            {currentDataPoint && (
              <div className="text-center mt-2">
                Current Value: {currentDataPoint.value}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default SensorDataVisualization;