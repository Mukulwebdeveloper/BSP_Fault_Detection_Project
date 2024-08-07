"use client"
import React, { useState } from 'react';

interface Anomaly {
    start: Date;
    end: Date;
    value: number;
}

interface TimeRange {
    start: Date;
    end: Date;
}

const AnomalyChecker: React.FC = () => {
    const profiles: number[] = [10, 12, 16, 20, 40];
    const models: string[] = ['Model A', 'Model B', 'Model C'];
    const anomalies: Anomaly[] = [
        { start: new Date('2023-07-26T10:00:00'), end: new Date('2023-07-26T10:15:00'), value: 1 },
        { start: new Date('2023-07-26T11:00:00'), end: new Date('2023-07-26T11:30:00'), value: 1 },
    ];
    

    const [selectedProfile, setSelectedProfile] = useState<number>(profiles[0]);
    const [selectedModel, setSelectedModel] = useState<string>(models[0]);
    const [startTime, setStartTime] = useState<string>('2023-07-26T09:00');
    const [endTime, setEndTime] = useState<string>('2023-07-26T11:00');
    const [anomalyTable, setAnomalyTable] = useState<Anomaly[]>([]);
    const [normalTimeRanges, setNormalTimeRanges] = useState<TimeRange[]>([]);
    const [selectedNormalTime, setSelectedNormalTime] = useState<string>('');

    const handleCheckAnomaly = () => {
    console.log(anomalies);

        const filteredAnomalies = anomalies.filter(anomaly => 
            anomaly.start >= new Date(startTime + ':00') && anomaly.end <= new Date(endTime + ':00')
        );
        setAnomalyTable(filteredAnomalies);

        const normalRanges: TimeRange[] = [];
        let currentTime = new Date(startTime + ':00');
        filteredAnomalies.forEach(anomaly => {
            if (currentTime < anomaly.start) {
                normalRanges.push({ start: currentTime, end: anomaly.start });
            }
            currentTime = anomaly.end;
        });
        if (currentTime < new Date(endTime + ':00')) {
            normalRanges.push({ start: currentTime, end: new Date(endTime + ':00') });
        }
        setNormalTimeRanges(normalRanges);
        setSelectedNormalTime('');
    };

    const handleStartTraining = () => {
        if (selectedNormalTime) {
            const [start, end] = selectedNormalTime.split(' - ');
            alert(`Starting training for ${selectedModel} with ${selectedProfile}mm profile for time range: ${start} - ${end}`);
        } else {
            alert('Please select a normal time range before starting training.');
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Anomaly Checker & Train Models</h2>
            <div className="space-y-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profile:</label>
                    <select 
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={selectedProfile} 
                        onChange={e => setSelectedProfile(Number(e.target.value))}
                    >
                        {profiles.map(profile => (
                            <option key={profile} value={profile}>{profile}mm</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model:</label>
                    <select 
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={selectedModel} 
                        onChange={e => setSelectedModel(e.target.value)}
                    >
                        {models.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time:</label>
                    <input 
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        type="datetime-local" 
                        value={startTime} 
                        onChange={e => setStartTime(e.target.value)} 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time:</label>
                    <input 
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        type="datetime-local" 
                        value={endTime} 
                        onChange={e => setEndTime(e.target.value)} 
                    />
                </div>
            </div>
            <button 
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300"
                onClick={handleCheckAnomaly}
            >
                Check Anomaly
            </button>
            {anomalyTable.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-3 text-gray-800">Anomaly Table</h3>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-red-400">
                                <th className="border p-2 text-left">Sr. No.</th>
                                <th className="border p-2 text-left">Start Time</th>
                                <th className="border p-2 text-left">End Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {anomalyTable.map((anomaly, index) => (
                                <tr key={index} className="bg-red-300 hover:bg-red-400">
                                    <td className="border p-2">{index + 1}</td>
                                    <td className="border p-2">{anomaly.start.toLocaleTimeString()}</td>
                                    <td className="border p-2">{anomaly.end.toLocaleTimeString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {normalTimeRanges.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-3 text-gray-800">Normal Time Ranges</h3>
                    <select 
                        className="w-full p-2 mb-4 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        value={selectedNormalTime}
                        onChange={(e) => setSelectedNormalTime(e.target.value)}
                    >
                        <option value="">Select a normal time range</option>
                        {normalTimeRanges.map((range, index) => (
                            <option key={index} value={`${range.start.toLocaleTimeString()} - ${range.end.toLocaleTimeString()}`}>
                                {range.start.toLocaleTimeString()} - {range.end.toLocaleTimeString()}
                            </option>
                        ))}
                    </select>
                    <button 
                        className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition duration-300"
                        onClick={handleStartTraining}
                    >
                        Start Training
                    </button>
                </div>
            )}
        </div>
    );
};

export default AnomalyChecker;