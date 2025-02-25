import pandas as pd
import json
from dotenv import load_dotenv
import os
from pymongo import MongoClient


data_path = 'garage_data/garage_availability.csv'
json_path = 'garage_data/jsons/garage_availability.json'

# Set up mongo
load_dotenv(dotenv_path='../.env')
mongo_uri = os.getenv('MONGO_URI')
m_client = MongoClient(mongo_uri)
db = m_client['KnightNav']
collection = db['Garage Availability']


# Helper function to create the availability array of objects for each garage
def create_availability_schedule(df, garage_name):
    availability_schedule = []
    for _, row in df.iterrows():
        availability_schedule.append({
            "time": row['timestamp'].strftime('%H:%M'),
            "spots_available": row[garage_name]
        })
    return availability_schedule


def process_garages(df):
    garages = ["Garage A", "Garage B", "Garage C", "Garage D", "Garage H", "Garage I"]
    final_json = []

    for garage in garages:
        garage_data = {
            "garage": garage.split()[1],  # Extract just the letter (A, B, C, etc.)
            "location": "Here",  # Placeholder location
            "capacity_schedule": []
        }

        # Get the availability data for each day
        for day in df['day'].unique():
            day_data = {
                "day": df[df['day'] == day]['weekday'].iloc[0],  # Get the name of the day
                "availability_schedule": create_availability_schedule(df[df['day'] == day], garage)
            }
            garage_data["capacity_schedule"].append(day_data)

        final_json.append(garage_data)

    return final_json


# Automatically upload the data to the database
def upload_to_mongo(data):
    # Wipe the previous contents in the collection
    collection.delete_many({})

    # Insert the new data
    res = collection.insert_many(data)

    # Verify the operation was successfuly
    if res.acknowledged:
        print(f"Successfully inserted {len(res.inserted_ids)} records.")
    else:
        print("Insert operation failed.")


def main():
    # Set up the dataset
    df = pd.read_csv(data_path)

    # Convert 'timestamp' to a datetime object
    df['timestamp'] = pd.to_datetime(df['Date'], format="%d-%m-%Y %H:%M")
    df['timestamp'] = df['timestamp'].dt.round('5min')  # Round time to 5 minute intervals (some of the readings are a minute off)

    # Group by day (we'll extract the day of the week and date)
    df['day'] = df['timestamp'].dt.date
    df['weekday'] = df['timestamp'].dt.day_name()

    data = process_garages(df)

    with open(json_path, 'w') as file:
        json.dump(data, file, indent=4)

    upload_to_mongo(data)


if __name__ == "__main__":
    main()