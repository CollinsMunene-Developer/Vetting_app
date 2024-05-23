FROM mongo:latest


# Set the working directory in the container\
WORKDIR /data

# Expose the port your MongoDB instance runs on
EXPOSE 27017

# Command to run MongoDB
CMD ["mongod"]