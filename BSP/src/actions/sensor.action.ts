"use server";

import { metadata } from "@/app/layout";
import { auth } from "@/auth";
import { ISensor, ISensorRegionWeight } from "@/lib/interfaces/sensor";
import { logger } from "@/lib/logger";
import { Region } from "@/lib/models/region.model";
import { Sensor } from "@/lib/models/sensor.model";
import { SensorRegionWeight } from "@/lib/models/sensorRegionWeight.model";
import connectToDB from "@/lib/mongoose";
import { AnyAaaaRecord } from "dns";
import { Weight } from "lucide-react";
import Optional from "mongoose";
import { json } from "stream/consumers";
const mongoose = require("mongoose"); // Assuming you have Mongoose installed
//load all sensor
//for geting all sensors
export const loadSensors = async () => {
  try {
    await connectToDB();
    const sensorList = await Sensor.find(
      {},
      {
        __v: 0,
        _id: 0,
      }
    ).exec();
    console.log("Sensors loaded:", sensorList);
    return JSON.stringify(sensorList);
  } catch (error) {
    console.log(error);
    return [];
  }
};
interface SensorData {
  Sensor_ID: string;
  Tagnames: string;
  weight: number;
}
//inital adding sensors to database
export const addSensorsToDatabase = async (sensorData: SensorData[]) => {
  try {
    await connectToDB();
    console.log(sensorData);
    for (const sensor of sensorData) {
      // Extract sensor information
      const sensorId = `[${sensor.Sensor_ID}]`; // Remove leading and trailing brackets
      const tagnames = sensor.Tagnames;
      const newSensor = new Sensor({
        Sensor_ID: sensorId,
        Tagname: tagnames,
      });

      try {
        await newSensor.save();
        console.log(`Added sensor: ${sensorId}`);
      } catch (error: any) {
        if (error.code === 11000) {
          // Duplicate key error (unique constraint)
          console.warn(
            `Sensor with ID: ${sensorId} already exists, skipping...`
          );
        } else {
          throw error; // Re-throw other errors
        }
      }
    }

    console.log("All sensors added successfully (or skipped if duplicates)!");
  } catch (error) {
    console.error(error);
  }
};
// use for initial setup of sensor.regions array
export const addsensortoregions = async (sensorData: {
  [region: string]: string[];
}) => {
  try {
    await connectToDB();
    console.log(sensorData);
    for (const region in sensorData) {
      const sensors = sensorData[region];
      for (const sensor of sensors) {
        const sensorRegionWeight = new SensorRegionWeight({
          Sensor_ID: sensor,
          regionName: region,
        });
        try {
          await sensorRegionWeight.save();
          console.log(`${sensor} added to region: ${region} successfully`);
        } catch (error) {
          console.log(error);
        }
      }
    }
    console.log("All sensors aded to  regions  successfully");
  } catch (error) {
    console.error(error);
  }
};
//add sensor to regions
interface Iselectedregions {
  [_id: string]: {
    workingStatus: boolean;
    regionName?: string;
    weight?: number;
  };
}
export const addSensorToRegions = async (
  selectedregions: Iselectedregions,
  sensor_id_tag: string
) => {
  try {
    await connectToDB();
    // console.log(selectedregions);
    const session = await auth();
    const user = session?.user;
    // console.log(user);

    for (const _id in selectedregions) {
      if (selectedregions[_id].workingStatus) {
        try {
          const data = await SensorRegionWeight.findOneAndUpdate(
            { _id: _id }, // Filter to find sensor by ID
            { $set: { workingStatus: true } }, // Update weight using $set operator
            { new: true } // Return the updated document
          );
          if (!data) {
            // console.warn(`Sensor with Tagnames: ${Tagnames} not found for update.`);
            logger.warn(
              `SensorRegionWeight id: ${_id} not found for update workingstatus.`
            );
          } else {
            logger.info(
              `Updated workingstatus changed true for ${data.Sensor_ID} in region: ${data.regionName} `,
              { metadata: { owner: user?.email } }
            );
          }
        } catch (error) {
          console.log(error);
        }
      }
    }

    // logger.info(`Add regions to this ${sensor.Tagnames} sensor successfuly`)
    await SendTriggerRequest();
    return {
      message: "Sensor added to regions successfully",
    };
  } catch (error) {
    console.log(error);
    return {
      message: "Failed to add sensor to regions",
    };
  }
};

//delete sensor form regions

export const deleteSensorFromRegions = async (
  selectedregions: Iselectedregions,
  sensor_id_tag: string
) => {
  try {
    await connectToDB();
    // console.log(selectedregions);
    const session = await auth();
    const user = session?.user;
    // console.log(user);

    for (const _id in selectedregions) {
      if (!selectedregions[_id].workingStatus) {
        try {
          const data = await SensorRegionWeight.findOneAndUpdate(
            { _id: _id }, // Filter to find sensor by ID
            { $set: { workingStatus: false } }, // Update weight using $set operator
            { new: true } // Return the updated document
          );
          if (!data) {
            // console.warn(`Sensor with Tagnames: ${Tagnames} not found for update.`);
            logger.warn(
              `SensorRegionWeight id: ${_id} not found for update workingstatus.`
            );
          } else {
            logger.info(
              `Updated workingstatus changed to false for ${data.Sensor_ID} in region: ${data.regionName} `,
              { metadata: { owner: user?.email } }
            );
          }
        } catch (error) {
          console.log(error);
        }
      }
    }

    // logger.info(`Add regions to this ${sensor.Tagnames} sensor successfuly`)
    await SendTriggerRequest();
    return {
      message: "Sensor removed from regions successfully",
    };

    return {
      message: "Sensor Removed from regions successfully",
    };
  } catch (error) {
    console.log(error);
    return {
      message: "Failed to Remove sensor from regions",
    };
  }
};

//modify weigh of sensors
export interface SensorWeights {
  [_id: string]: { weight: number };
}
export const modifyWeightOfSensors = async (
  sensorWeights: SensorWeights,
  region: string
) => {
  try {
    const session = await auth();
    const user = session?.user;
    await connectToDB(); // Connect to database
    const regionMap: IFormattedRegion = {};

    for (const [_id, { weight }] of Object.entries(sensorWeights)) {
      // console.log(`Sensor ID: ${Tagnames}, Weight: ${weight}`);
      try {
        await connectToDB(); // Ensure database connection is established

        const sensor = await SensorRegionWeight.findOneAndUpdate(
          { _id: _id }, // Filter to find sensor by ID
          { $set: { weight } }, // Update weight using $set operator
          { new: true } // Return the updated document
        ).populate("sensor", "Tagname")
        .exec();;

        if (!sensor) {
          // console.warn(`Sensor with Tagnames: ${Tagnames} not found for update.`);
          logger.warn(`Sensor with Tagnames: ${_id} not found for update.`, {
            metadata: { owner: user?.email },
          });
        } else {
          const regionName = sensor.regionName;
          const sensorData: ISensorData = {
            sensor: `${sensor.Sensor_ID}_${sensor?.sensor?.Tagname}`,
            weight: sensor.weight,
          };

          if (!regionMap[regionName]) {
            regionMap[regionName] = [];
          }

          regionMap[regionName].push(sensorData);
          logger.info(`Updated sensor weight for: ${_id} :${weight}`, {
            metadata: { owner: user?.email },
          });
        }
      } catch (error) {
        logger.error("Error updating sensor weight:", error);
        // Handle individual sensor update errors (optional)
      }
    }
    console.log(regionMap);
    await SendTriggerRequest();
    return {
      message: "Sensor weights updated successfully",
    };
  } catch (error) {
    console.error('Error updating sensor weights:', error);
    return {
      message: "Error updating sensor weights",
    };
  }
};

//new sensor ading
interface SensorEntry {
  regionName: string;
  weight: number;
}
interface Iaddsensor {
  Sensor_ID: string;
  Tagname: string;
  entries: SensorEntry[];
}

export const addnewsensor = async (data: Iaddsensor) => {
  try {
    const session = await auth();
    const user = session?.user;
    await connectToDB();
    let sensor;
    sensor=await Sensor.findOne({Sensor_ID: data.Sensor_ID,});
    if(!sensor){

      sensor = new Sensor({
       Sensor_ID: data.Sensor_ID,
       Tagname: data.Tagname,
     });
     await sensor.save();
    }
    // if (!sensor) {
    //   return {
    //     message: "signal  already present",
    //   };
    // }
    logger.info(
      `Sensor with id: ${data.Sensor_ID} add to database  successfulllly `,
      { metadata: { owner: user?.email } }
    );
    for (const entrie of data.entries) {
      const sensorregion = new SensorRegionWeight({
        Sensor_ID: data.Sensor_ID,
        weight: entrie.weight,
        regionName: entrie.regionName,
      });
      try {
        await sensorregion.save();
        logger.info(
          `${data.Sensor_ID} added to region: ${entrie.regionName} successfully`,
          { metadata: { owner: user?.email } });
        await SendTriggerRequest();
        return {
          message: "Sensor weights updated successfully",
        };
        
      } catch (error) {
        logger.error(
          `${data.Sensor_ID} added to region: ${entrie.regionName}  was unable to add `,
          { metadata: { owner: user?.email } }
        );
      }
    }
    return {
      message: "sensor and its regions add successfuly",
    };
  } catch (error) {
    console.log(error);
    return {
      message: "somthing went wrong on server",
    };
  }
};

//helper function for sending json file to backend
const SendTriggerRequest = async () => {
  try {
    await connectToDB();

    const url = process.env.Metaflow_URL;
    const response = await fetch(`${url}/api/UpdateSensorJson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // No body since no data is being sent
      body: null,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Response from /api/UpdateSensorJson:', data);
    return data;

  } catch (error) {
    console.error("Error sending request to API:", error);
    throw new Error("Error sending request to API");
  }
};

//check sensor is already present in db or not
export const  checkSensor=async(Sensor_ID:string,Tagname:string)=>{
  try {
    await connectToDB();
    const sensor:any = await SensorRegionWeight.find({ Sensor_ID }).populate("sensor", "Tagname")
    .exec();;
    console.log(sensor);

    const regions=sensor.map((r:any)=>r.regionName)
    
    if(sensor.length > 0)  {
      if(sensor[0].sensor.Tagname===Tagname){

        return {
          message: "signal  already present",
        };
      }
      else{
        console.log(regions);
        
        return{
          message:"either sensor is already present",
          regions
        }
      }
    }
    else{
      return{
        message:"signal is not present"
      }
    }

  } catch (error) {
    console.log(error);
    return {
      message: "somthing went wrong on server",
    };
  }
}


//download json file
interface ISensorData {
  sensor: string;
  weight: number;
}

interface IFormattedRegion {
  [regionName: string]: ISensorData[];
}
export const downloadJsonfile = async () => {
  try {
    await connectToDB();

    const sensorRegions = await SensorRegionWeight.find()
      .populate("sensor", "Tagname")
      .exec();

    const regionMap: IFormattedRegion = {};

    sensorRegions.forEach((sensorRegion) => {
      const regionName = sensorRegion.regionName;
      const sensorData: ISensorData = {
        sensor: `${sensorRegion.Sensor_ID}_${sensorRegion?.sensor?.Tagname}`,
        weight: sensorRegion.weight,
      };

      if (!regionMap[regionName]) {
        regionMap[regionName] = [];
      }

      regionMap[regionName].push(sensorData);
    });
    console.log(regionMap);

    return JSON.stringify(regionMap, null, 2);
  } catch (error) {
    console.error("Error formatting regions:", error);
    throw new Error("Error formatting regions");
  }
};
const SendUpdated_regions = async (
  selectedregions: Iselectedregions,
  sensor_id_tag: string,
  check: boolean
) => {
  try {
    const formated_data = Object.values(selectedregions)
      .filter((region) => region.regionName !== undefined &&!region.workingStatus)
      .map((region) => region.regionName);
    // const url="http://localhost:3000"
    const url = process.env.Metaflow_URL || "http://localhost:5000";
    const response = await fetch(`${url}/api/remove-sensor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sensor: sensor_id_tag,
        regions: formated_data,
      }),
    });
    console.log({
      sensor: sensor_id_tag,
      regions: formated_data,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Response from /api/add/remove-sensor:", data);
    return data;
  } catch (error) {
    console.error("Error in  sending sensor and region data :", error);
    throw new Error("Error in  sending sensor and region data ");
  }
};
const SendAdd_regions = async (
  selectedregions: Iselectedregions,
  sensor_id_tag: string
) => {
  try {
    console.log(selectedregions);

    const regions = Object.fromEntries(
      Object.entries(selectedregions)
        .filter(
          ([_, value]) =>
            value.workingStatus &&
            value.regionName &&
            value.weight !== undefined
        )
        .map(([_, value]) => [value.regionName, value.weight])
    );
    const temp = {};

    // const url="http://localhost:3000"
    const url = process.env.Metaflow_URL || "http://localhost:5000";
    const response = await fetch(`${url}/api/add-signal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signal: sensor_id_tag,
        regions,
      }),
    });
    console.log({
      signal: sensor_id_tag,
      regions,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Response from /api/add-signal:", data);
    return data;
  } catch (error) {
    console.error("Error in  sending sensor and region data :", error);
    throw new Error("Error in  sending sensor and region data ");
  }
};
//helper function for sending json file to backend
const SendJSONFile = async () => {
  try {
    await connectToDB();

    const sensorRegions = await SensorRegionWeight.find()
      .populate("sensor", "Tagname")
      .exec();

    const regionMap: IFormattedRegion = {};

    sensorRegions.forEach((sensorRegion) => {
      const regionName = sensorRegion.regionName;
      const sensorData: ISensorData = {
        sensor: `${sensorRegion.Sensor_ID}_${sensorRegion?.sensor?.Tagname}`,
        weight: sensorRegion.weight,
      };

      if (!regionMap[regionName]) {
        regionMap[regionName] = [];
      }
      if (sensorRegion.workingStatus) regionMap[regionName].push(sensorData);
    });
    console.log(regionMap);

    // Send the regionMap to /api/getjson
    // const url="http://localhost:3000"
    const url = process.env.Metaflow_URL || "http://localhost:5000";
    const response = await fetch(`${url}/api/getjson`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(regionMap),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Response from /api/getjson:", data);
    return data;
  } catch (error) {
    console.error("Error formatting regions or sending JSON:", error);
    throw new Error("Error formatting regions or sending JSON");
  }
};
//download regionwise picklefille
interface IFormattedRegion2 {
  [regionName: string]: string[];
}
export const downloadRegionwisePicklefile = async () => {
  try {
    await connectToDB();

    const sensorRegions = await SensorRegionWeight.find();

    const regionMap: IFormattedRegion2 = {};

    sensorRegions.forEach((sensorRegion) => {
      const regionName = sensorRegion.regionName;

      if (!regionMap[regionName]) {
        regionMap[regionName] = [];
      }
      if (sensorRegion.workingStatus) {
        regionMap[regionName].push(sensorRegion.Sensor_ID);
      }
    });
    console.log(regionMap);

    return JSON.stringify(regionMap, null, 2);
  } catch (error) {
    console.error("Error formatting regions:", error);
    throw new Error("Error formatting regions");
  }
};
