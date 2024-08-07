import SensorDataVisualization from '@/components/SensorDataVisualization'
import { sensorDataArray } from '@/constants/temp'
import React from 'react'

const page = () => {
  return (
    <div>
        <SensorDataVisualization sensorDataArray={sensorDataArray} />
    </div>
  )
}

export default page