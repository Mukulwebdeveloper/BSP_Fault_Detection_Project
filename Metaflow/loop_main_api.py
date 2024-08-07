###################################################################################################################
####################### file to call the main loop.py file which contains metaflow code ###########################
#### this file reads data from the csv file and triggers a function call for each minute of data retrieved ########
############ also saves data for that minute in parquer format ###################################################
###################################################################################################################




from flask import Flask, request, jsonify
import pandas as pd
import subprocess
import time
import os
import argparse
import json
from flask_cors import CORS
import threading
from pymongo import MongoClient


# Set Metaflow environment variables
#os.environ["METAFLOW_SERVICE_URL"] = "http://localhost:8080"
#os.environ["METAFLOW_DEFAULT_METADATA"] = "service"
"""
# Read your data into a DataFrame (replace this with your actual data loading logic)
from datetime import datetime
d_parser = lambda x : datetime.strptime(x,"%d.%m.%Y %H:%M:%S.%f")
# Read your data into a DataFrame (replace this with your actual data loading logic)
df = pd.read_csv('/data2/naman/metaflow/00.24.56_01.24.56.txt', sep='\t', parse_dates=['Time'], date_parser=d_parser)
#df.set_index('Time', inplace=True)
print(df.head())
"""

app = Flask(__name__)
CORS(app)


def save_to_parquet(df, timestamp):
    print("In save to parquet function.....")
    date_str = timestamp.strftime("%Y-%m-%d")
    time_str = timestamp.strftime("%H:%M:%S")
    hour_str = timestamp.strftime("%H")
    minute_str = timestamp.strftime("%M")
    
    directory = os.path.join("iba_data", date_str, hour_str)
    if not os.path.exists(directory):
        os.makedirs(directory)
        
    file_name = f"{time_str}.parquet"
    file_path = os.path.join(directory, file_name)
    df.to_parquet(file_path)
    print(f"Parquet file created successfully at {file_path}")


# Function to call the Metaflow workflow for a batch of data
def call_workflow(file_path, profile):
    print("Calling subprocess...")
    try:
        profile_config = f"regions_info_{profile}.json"
        print("data path name: ", file_path)
        print("profile config file name: ", profile_config)
        time.sleep(20)
        subprocess.run(["python", "./loop.py", "run", "--data_path", file_path, "--config", profile_config], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Command failed with exit code: {e.returncode}")
    print("Subprocess completed.")



# Endpoint to update sensor weights
@app.route('/api/UpdateSensorJson', methods=['POST'])
def create_json_from_mongodb():
    uri = 'mongodb://root:example_password_change_me@mongo:27017/'
    db_name = 'nextAuth'
    collection_name = 'sensorregionweights'
    excel_file = 'Finalised_region_combined_tagnames.xlsx'
    output_file = 'sensor_data_weights.json'

    # Initialize the response
    response = {'message': 'Data processed successfully'}

    # Load sensor names from the Excel file
    try:
        df = pd.read_excel(excel_file, engine='openpyxl')
        sensor_mapping = dict(zip(df.iloc[:, 0], df.iloc[:, 1]))
    except FileNotFoundError:
        return jsonify({'error': 'Excel file not found'}), 500
    except Exception as e:
        return jsonify({'error': f'Error reading Excel file: {str(e)}'}), 500

    # Connect to MongoDB
    try:
        client = MongoClient(uri)
        db = client[db_name]
        collection = db[collection_name]
    except Exception as e:
        return jsonify({'error': f'Error connecting to MongoDB: {str(e)}'}), 500
    
    # Fetch all documents from the collection
    try:
        documents = collection.find()
    except Exception as e:
        return jsonify({'error': f'Error fetching data from MongoDB: {str(e)}'}), 500
    
    # Create a dictionary to store the processed data
    data = {}
    
    for doc in documents:
        region = doc.get('regionName')
        sensor_id = doc.get('Sensor_ID')
        weight = doc.get('weight')
        working_status = doc.get('workingStatus')

        # Validate document fields
        if not all([region, sensor_id, weight is not None, working_status is not None]):
            return jsonify({'error': 'Document missing required fields'}), 500

        # Only include sensors with workingStatus as True
        if working_status is not True:
            continue

        # Get the sensor name from the mapping
        sensor_name = sensor_mapping.get(sensor_id, "Unknown Sensor")

        if region not in data:
            data[region] = []
        
        data[region].append({
            "sensor": f"{sensor_id}_{sensor_name}",
            "weight": weight
        })
    
    # Write the data to a JSON file
    try:
        with open(output_file, 'w') as file:
            json.dump(data, file, indent=2)
    except Exception as e:
        return jsonify({'error': f'Error writing JSON file: {str(e)}'}), 500
    
    print(f"Data has been written to {output_file}")
    return jsonify(response), 200



# Global variable to store current profile
current_profile = None

@app.route('/api/profile', methods=['POST'])
def run_metaflow():
    global current_profile
    data = request.get_json()
    profile = data.get('profile')
    
    if profile not in ['10mm', '12mm', '16mm', '20mm', '40mm']:
        return jsonify({'error': 'Invalid profile value'}), 400
    
    current_profile = profile
    
    # Start processing asynchronously
    threading.Thread(target=start_processing, args=(profile,)).start()
    
    return jsonify({'message': 'Processing started successfully'})


def start_processing(profile):
    
    start_time = time.time()
    count = 0
    global current_profile

    from datetime import datetime
    #d_parser = lambda x : datetime.strptime(x,"%Y-%m-%d %H:%M:%S")
    #df = pd.read_csv('./iba_data.txt', sep=',', parse_dates=['i_time'], date_parser=d_parser)

    d_parser = lambda x : datetime.strptime(x,"%d.%m.%Y %H:%M:%S.%f")
    df = pd.read_csv('./00.24.56_01.24.56.txt', sep='\t', parse_dates=['Time'], date_parser=d_parser)
    df.set_index('Time', inplace=True)
    print("--------------------------Printing df head-----------------", df.head())
    
    
    tagnames_df = pd.read_excel("./Finalised_region_combined_tagnames.xlsx")
    mapping_dict = dict(zip(tagnames_df['Tagnames'], tagnames_df['Sensor_ID']))

    while True:
        # Fetch data from PostgreSQL
        batch_df = df[:60]
        #batch_df.rename(columns={'i_time': 'Time'}, inplace=True)
        #batch_df.drop(columns=['local_time'], inplace=True)
        #batch_df.set_index('Time', inplace=True)
        batch_df.rename(columns=mapping_dict, inplace=True)
        #batch_df['[9:17]'] = batch_df['[9:16]']
        batch_df.replace({'f': 0, 't': 1}, inplace=True)

        if 'index' in df.columns:
            batch_df.drop(['index'], axis=1, inplace=True)
        
        # If there is no new data, wait for some time before trying again
        if batch_df.empty:
            print("No new data found. Waiting for 1 minute...")
            time.sleep(60)
            count += 1
            if count == 2:
                break
            continue
        
        #print(batch_df)
        #print("In while loop...", df.head())
        timestamp = batch_df.index[0]
        save_to_parquet(batch_df, timestamp)

        # Write the minute data to a temporary CSV file
        file_path = 'temp_data.csv'
        batch_df.to_csv(file_path, index=True)

        # Call the workflow for the batch
        call_workflow(file_path, profile)

        df = df[60:]
        if len(df) < 60 or profile != current_profile:
            break

    end_time = time.time()
    total_time = end_time - start_time
    print(f"Total time taken: {total_time} seconds")

if __name__ == '__main__':
    # app.run(debug=True)
    app.run(host='0.0.0.0', port=5000, debug=True)


#####################################################################################
### command to run the file: python3 loop_main.py --profile 16mm ####################
### command to run the file: python3 loop_main.py --profile 20mm ####################
### command to run the file: python3 loop_main.py --profile 12mm ####################
### command to run the file: python3 loop_main.py --profile 10mm ####################
#####################################################################################
