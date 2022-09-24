import socket
import _thread
import camera
import sys
from machine import Pin

config = json.loads(open('config.json', 'r').read())

# # flash gpio
flash = Pin(4, Pin.OUT)
flash_state = False
flash.value(flash_state)
# # camera innit
camera.init(0, format=camera.JPEG)
# # camera settings
camera.framesize(camera.FRAME_240X240)

server_ip = config["server_address"]
udp_port = config["udp_port"]
tcp_port = config["tcp_port"]


def udp_socket():
    print("udp_socket called")
    udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    return udp_socket


def stream(udp_socket):
    print("stream called")
    while True:
        img_buffer = camera.capture()
        udp_socket.sendto(img_buffer, (server_ip, udp_port))


def tcp_socket():
    global server_ip, tcp_port
    print("tcp_socket called, connecting to " + server_ip + ":" + str(tcp_port))
    tcp_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    tcp_socket.connect((server_ip, tcp_port))
    return tcp_socket


def listen_to_commands(tcp_socket):
    global flash, flash_state
    print("listen_to_commands called")
    while True:
        command = tcp_socket.recv(1024).decode()
        print(command)
        if command == "flash":
            flash_state = not flash_state
            flash.value(flash_state)


while True:
    try:
        tcp_socket = tcp_socket()

        comandListener = _thread.start_new_thread(
            listen_to_commands, (tcp_socket,))

        udp_socket = udp_socket()
        stream(udp_socket)

    except KeyboardInterrupt:
        print("keyboard interrupt, exiting...")
        sys.exit(1)
    except Exception as ex:
        print(str(ex))
        try:
            comandListener.exit()
        except:
            pass